import { Editor, MarkdownView, Menu, Notice, Plugin, setIcon } from "obsidian";
import { DEFAULT_SETTINGS } from "./settings";
import { SpeechCraftSettings } from "./types";
import { TTSManager } from "./services/ttsManager";
import { TextExtractor } from "./services/textExtractor";
import { KeychainService } from "./services/keychainService";
import { PlayerBar } from "./ui/playerBar";
import { SpeechCraftSettingTab } from "./ui/settingsTab";
import { speechHighlightField, clearHighlightFromActiveView } from "./editor/karaokeHighlight";
import { createParagraphPlayExtension } from "./editor/paragraphPlayPlugin";
import { JumpToParagraphModal } from "./modals/jumpToParagraphModal";

export default class SpeechCraftPlugin extends Plugin {
  settings: SpeechCraftSettings = DEFAULT_SETTINGS;
  ttsManager!: TTSManager;
  textExtractor!: TextExtractor;
  keychainService!: KeychainService;
  playerBar!: PlayerBar;
  statusBarEl!: HTMLElement;
  activePlayingFilePath: string | null = null;
  private saveTimeout: any = null;
  private activeJumpModal: JumpToParagraphModal | null = null;

  async onload() {
    await this.loadSettings();

    // 1. Initialize Services
    this.keychainService = new KeychainService(this.app);
    this.ttsManager = new TTSManager(this.app, this.settings, this.keychainService);
    this.textExtractor = new TextExtractor(this.app, () => this.settings);

    // 2. Register CodeMirror 6 Extensions (Karaoke & Paragraph Hover Play)
    this.registerEditorExtension(speechHighlightField);
    this.registerEditorExtension(createParagraphPlayExtension(this));

    // 2b. Register Markdown Post-Processor for Reading View
    this.registerMarkdownPostProcessor((element) => {
      if (!this.settings.showParagraphHoverPlay) return;

      const paragraphs = element.querySelectorAll("p, h1, h2, h3, h4, h5, h6");
      paragraphs.forEach((p) => {
        const text = p.textContent?.trim();
        if (!text) return;

        const btn = document.createElement("span");
        btn.className = "sc-para-play-btn sc-para-play-btn-reading";
        btn.setAttribute("aria-label", "Play from this paragraph");
        btn.setAttribute("title", "Play from this paragraph");
        setIcon(btn, "play");

        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!this.isPlayerActive()) return;
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view && view.editor) {
            const docText = view.editor.getValue();
            const prefix = text.slice(0, Math.min(30, text.length));
            const idx = docText.indexOf(prefix);
            if (idx !== -1) {
              this.speakFromOffset(idx, view.editor);
            } else {
              this.speakActiveContext(view.editor);
            }
          }
        };

        p.classList.add("sc-para-reading-container");
        p.prepend(btn);
      });
    });

    // 3. Initialize Player Bar UI
    this.playerBar = new PlayerBar(
      this.ttsManager,
      () => this.settings,
      async (rate) => {
        this.settings.rate = rate;
        await this.saveSettings();
      }
    );
    this.playerBar.onJumpRequest = () => {
      this.openJumpToParagraphModal();
    };
    this.playerBar.onVisibilityChange = () => {
      this.updatePlayerActiveState();
    };
    this.playerBar.mount(document.body);

    // 4. Status Bar Item
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("speech-craft-status-bar");
    this.statusBarEl.setText("Speech Craft");
    this.statusBarEl.onclick = () => {
      const status = this.ttsManager.getStatus();
      if (status.state === "idle") {
        this.speakActiveContext();
      } else {
        this.ttsManager.togglePlayPause();
      }
    };

    // Update status bar on playback state changes & auto-save playback position
    this.ttsManager.onStatusChange((status) => {
      this.updatePlayerActiveState(status);

      if (this.activePlayingFilePath && status.totalSegments > 0) {
        if (!this.settings.filePositions) {
          this.settings.filePositions = {};
        }
        this.settings.filePositions[this.activePlayingFilePath] = {
          paragraphIndex: status.currentSegmentIndex,
          totalParagraphs: status.totalSegments,
          timestamp: Date.now()
        };
        this.debouncedSaveSettings();
      }

      if (status.state === "playing") {
        this.statusBarEl.setText(`Playing (¶ ${status.currentSegmentIndex + 1}/${status.totalSegments})`);
      } else if (status.state === "paused") {
        this.statusBarEl.setText("Paused");
      } else if (status.state === "loading") {
        this.statusBarEl.setText("Synthesizing...");
      } else {
        this.statusBarEl.setText("Speech Craft");
      }
    });

    // 5. Ribbon Icon
    this.addRibbonIcon("headphones", "Speech Craft: Read note / selection", () => {
      this.speakActiveContext();
    });

    // 6. Alt + Right Click to Read from Any Sentence
    this.registerDomEvent(document, "contextmenu", (evt: MouseEvent) => {
      if (!evt.altKey) return;

      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view || !view.editor) return;

      // Ensure click was inside the Markdown editor container
      const editorDom = (view.editor as any).cm?.dom || (view as any).contentEl;
      if (!editorDom || !editorDom.contains(evt.target as Node)) return;

      evt.preventDefault();
      evt.stopPropagation();

      let offset = 0;
      const cm = (view.editor as any).cm;
      if (cm && typeof cm.posAtCoords === "function") {
        const cmPos = cm.posAtCoords({ x: evt.clientX, y: evt.clientY });
        if (typeof cmPos === "number") {
          offset = cmPos;
        } else if (cmPos && typeof cmPos.pos === "number") {
          offset = cmPos.pos;
        }
      }
      if (!offset) {
        const cursor = view.editor.getCursor();
        offset = view.editor.posToOffset(cursor);
      }

      this.speakFromOffset(offset, view.editor);
    });

    // 7. Smart Auto-Pause on Edit
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor: Editor) => {
        this.ttsManager.markDocumentEdited();
        if (this.settings.autoPauseOnEdit && this.ttsManager.getStatus().state === "playing") {
          this.ttsManager.pause();
          new Notice("Speech Craft: Auto-paused for editing");
        }
      })
    );

    // 8. File Close Detection: When playing file is closed, stop & save location
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.checkIfPlayingFileWasClosed();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.checkIfPlayingFileWasClosed();
      })
    );

    // 9. Commands
    this.addCommand({
      id: "speak-context",
      name: "Speak Selection or Active Note",
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (checking) return !!view;
        this.speakActiveContext();
        return true;
      }
    });

    this.addCommand({
      id: "jump-to-paragraph",
      name: "Jump to Paragraph...",
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (checking) return !!view || this.ttsManager.getSegments().length > 0;
        this.openJumpToParagraphModal();
        return true;
      }
    });

    this.addCommand({
      id: "restart-from-beginning",
      name: "Restart Active Note from Beginning (Paragraph 1)",
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (checking) return !!view;
        const activeFile = view?.file;
        if (activeFile && this.settings.filePositions) {
          delete this.settings.filePositions[activeFile.path];
          this.saveSettings();
        }
        const extracted = this.textExtractor.extractFromActiveView();
        if (extracted && extracted.segments.length > 0) {
          if (activeFile) this.activePlayingFilePath = activeFile.path;
          this.playerBar.show();
          this.ttsManager.startPlaybackFromIndex(extracted.segments, 0);
          new Notice(`Restarted "${activeFile?.basename || "note"}" from Paragraph 1`);
        }
        return true;
      }
    });

    this.addCommand({
      id: "toggle-play-pause",
      name: "Play / Pause",
      callback: () => {
        const status = this.ttsManager.getStatus();
        if (status.state === "idle") {
          this.speakActiveContext();
        } else {
          this.ttsManager.togglePlayPause();
        }
      }
    });

    this.addCommand({
      id: "replay-current-sentence",
      name: "Replay Current Paragraph",
      callback: () => {
        this.ttsManager.replayCurrentSegment();
      }
    });

    this.addCommand({
      id: "reread-sentence-and-continue",
      name: "Re-read Current Sentence & Continue (Resume from Edit)",
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.editor) return;
        const cursor = view.editor.getCursor();
        const offset = view.editor.posToOffset(cursor);
        this.speakFromOffset(offset, view.editor);
      }
    });

    this.addCommand({
      id: "stop-speech",
      name: "Stop Playback",
      callback: () => {
        this.ttsManager.stop();
        this.playerBar.hide();
      }
    });

    this.addCommand({
      id: "next-sentence",
      name: "Next Sentence",
      hotkeys: [{ modifiers: ["Alt"], key: "ArrowRight" }],
      callback: () => {
        this.ttsManager.nextSentence();
      }
    });

    this.addCommand({
      id: "prev-sentence",
      name: "Previous Sentence",
      hotkeys: [{ modifiers: ["Alt"], key: "ArrowLeft" }],
      callback: () => {
        this.ttsManager.previousSentence();
      }
    });

    this.addCommand({
      id: "next-segment",
      name: "Next Paragraph",
      hotkeys: [{ modifiers: ["Alt"], key: "n" }],
      callback: () => {
        this.ttsManager.next();
      }
    });

    this.addCommand({
      id: "prev-segment",
      name: "Previous Paragraph",
      hotkeys: [{ modifiers: ["Alt"], key: "p" }],
      callback: () => {
        this.ttsManager.previous();
      }
    });

    // 10. Editor Context Menu Integration
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
        const selection = editor.getSelection();
        if (selection && selection.trim().length > 0) {
          menu.addItem((item) => {
            item
              .setTitle("Speak Selection (Speech Craft)")
              .setIcon("headphones")
              .onClick(() => {
                this.speakActiveContext(editor);
              });
          });
        }
      })
    );

    // 11. Settings Tab
    this.addSettingTab(new SpeechCraftSettingTab(this.app, this));

    // 12. Sync Initial Player Active State
    this.updatePlayerActiveState();
  }

  speakActiveContext(editor?: Editor) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const activeFile = view?.file;
    const extracted = this.textExtractor.extractFromActiveView(editor);
    if (!extracted || extracted.segments.length === 0) {
      new Notice("Speech Craft: No readable text found in active note");
      return;
    }

    if (activeFile) {
      this.activePlayingFilePath = activeFile.path;
    }

    // Check if there is a saved playback position for this note
    if (extracted.sourceType === "full-note" && activeFile && this.settings.rememberPlaybackPosition !== false) {
      const saved = this.settings.filePositions?.[activeFile.path];
      if (saved && saved.paragraphIndex > 0 && saved.paragraphIndex < extracted.segments.length) {
        new Notice(`▶ Resumed "${activeFile.basename}" from Paragraph ${saved.paragraphIndex + 1} of ${extracted.segments.length}`);
        this.playerBar.show();
        this.ttsManager.startPlaybackFromIndex(extracted.segments, saved.paragraphIndex);
        return;
      }
    }

    const typeMsg =
      extracted.sourceType === "selection"
        ? "Speaking selection..."
        : "Reading active note...";

    new Notice(typeMsg);
    this.playerBar.show();
    this.ttsManager.startPlayback(extracted.segments);
  }

  speakFromOffset(offset: number, editor?: Editor) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const activeEditor = editor || view?.editor;
    if (!activeEditor) return;
    const activeFile = view?.file;
    const extracted = this.textExtractor.extractFromActiveView(activeEditor);
    if (!extracted || extracted.segments.length === 0) {
      new Notice("Speech Craft: No readable text found in active note");
      return;
    }

    if (activeFile) {
      this.activePlayingFilePath = activeFile.path;
    }

    const match = this.textExtractor.findSegmentAndSentenceAtOffset(extracted.segments, offset);
    new Notice(`Reading Paragraph ${match.segmentIndex + 1} of ${extracted.segments.length}...`);
    this.playerBar.show();
    this.ttsManager.startPlaybackFromIndexAndRatio(extracted.segments, match.segmentIndex, match.startRatio);
  }

  openJumpToParagraphModal() {
    if (this.activeJumpModal) {
      const modal = this.activeJumpModal;
      this.activeJumpModal = null;
      modal.close();
      return;
    }

    const currentSegments = this.ttsManager.getSegments();
    const status = this.ttsManager.getStatus();

    if (currentSegments.length > 0) {
      const modal = new JumpToParagraphModal(
        this.app,
        currentSegments,
        status.currentSegmentIndex,
        (targetIndex) => {
          this.ttsManager.jumpToParagraph(targetIndex);
          new Notice(`Jumped to Paragraph ${targetIndex + 1} of ${currentSegments.length}`);
        },
        () => {
          this.activeJumpModal = null;
        }
      );
      this.activeJumpModal = modal;
      modal.open();
      return;
    }

    // If nothing currently loaded, extract from active view
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const activeFile = view?.file;
    const extracted = this.textExtractor.extractFromActiveView();
    if (!extracted || extracted.segments.length === 0) {
      new Notice("Speech Craft: No readable paragraphs found in active note");
      return;
    }

    if (activeFile) {
      this.activePlayingFilePath = activeFile.path;
    }

    const saved = activeFile ? this.settings.filePositions?.[activeFile.path] : null;
    const initialIndex = saved?.paragraphIndex || 0;

    const modal = new JumpToParagraphModal(
      this.app,
      extracted.segments,
      initialIndex,
      (targetIndex) => {
        this.playerBar.show();
        this.ttsManager.startPlaybackFromIndex(extracted.segments, targetIndex);
        new Notice(`Jumped to Paragraph ${targetIndex + 1} of ${extracted.segments.length}`);
      },
      () => {
        this.activeJumpModal = null;
      }
    );
    this.activeJumpModal = modal;
    modal.open();
  }

  private checkIfPlayingFileWasClosed() {
    if (!this.activePlayingFilePath) return;

    // Check if the currently playing file is still open in any markdown leaf in the workspace
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    const isStillOpen = leaves.some((leaf) => {
      const v = leaf.view as MarkdownView;
      return v?.file?.path === this.activePlayingFilePath;
    });

    if (!isStillOpen) {
      // The file was closed! Save position and close player.
      const status = this.ttsManager.getStatus();
      if (status.totalSegments > 0) {
        if (!this.settings.filePositions) this.settings.filePositions = {};
        this.settings.filePositions[this.activePlayingFilePath] = {
          paragraphIndex: status.currentSegmentIndex,
          totalParagraphs: status.totalSegments,
          timestamp: Date.now()
        };
        this.saveSettings();
      }

      this.ttsManager.stop();
      this.playerBar.hide();
      clearHighlightFromActiveView(this.app);
      const fileName = this.activePlayingFilePath.split("/").pop() || "note";
      new Notice(`Speech Craft: Closed player & saved position for "${fileName}".`);
      this.activePlayingFilePath = null;
    }
  }

  debouncedSaveSettings() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveSettings();
    }, 1000);
  }

  isPlayerActive(): boolean {
    const status = this.ttsManager?.getStatus();
    const isPlaybackActive = status ? status.state !== "idle" : false;
    const isBarVisible = this.playerBar ? this.playerBar.isBarVisible() : false;
    return Boolean(isPlaybackActive || isBarVisible);
  }

  updatePlayerActiveState(status?: { state: string }) {
    const isPlaybackActive = status
      ? status.state !== "idle"
      : (this.ttsManager?.getStatus().state !== "idle");
    const isBarVisible = this.playerBar ? this.playerBar.isBarVisible() : false;
    const isActive = Boolean(isPlaybackActive || isBarVisible);
    document.body.classList.toggle("sc-player-active", isActive);
  }

  onunload() {
    if (this.activeJumpModal) {
      this.activeJumpModal.close();
      this.activeJumpModal = null;
    }
    this.ttsManager?.stop();
    this.playerBar?.unmount();
    clearHighlightFromActiveView(this.app);
    document.body.classList.remove("sc-player-active");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.filePositions) {
      this.settings.filePositions = {};
    }
    const isKeychainSupported = Boolean(
      (this.app as any).secretStorage && typeof (this.app as any).secretStorage.getSecret === "function"
    );
    if (this.settings.useKeychain === undefined && isKeychainSupported) {
      this.settings.useKeychain = true;
    }
    if (this.settings.googleApiSecretId === "speech-craft-google-api-key") {
      const secretStorage = (this.app as any).secretStorage;
      if (!secretStorage?.getSecret?.("speech-craft-google-api-key")) {
        this.settings.googleApiSecretId = "";
      }
    }
    if (this.settings.customApiSecretId === "speech-craft-custom-api-key") {
      const secretStorage = (this.app as any).secretStorage;
      if (!secretStorage?.getSecret?.("speech-craft-custom-api-key")) {
        this.settings.customApiSecretId = "";
      }
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.ttsManager?.updateSettings(this.settings);
    this.playerBar?.updateSettings(this.settings);
  }
}
