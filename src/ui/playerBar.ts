import { setIcon } from "obsidian";
import { TTSManager } from "../services/ttsManager";
import { AudioPlaybackStatus, PlaybackState, SpeechCraftSettings } from "../types";
import { formatSeconds } from "../utils/time";

export class PlayerBar {
  private containerEl: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private isVisible: boolean = false;
  private currentSpeedIndex: number = 2;
  private readonly speedOptions: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  // UI elements
  private playPauseBtn: HTMLElement | null = null;
  private prevBtn: HTMLElement | null = null;
  private nextBtn: HTMLElement | null = null;
  private stopBtn: HTMLElement | null = null;
  private speedBtn: HTMLElement | null = null;
  private progressSlider: HTMLInputElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private langBadge: HTMLElement | null = null;
  private segmentCounter: HTMLElement | null = null;
  private currentState: PlaybackState = "idle";

  constructor(
    private ttsManager: TTSManager,
    private getSettings: () => SpeechCraftSettings,
    private onRateChange?: (rate: number) => void
  ) {
    const currentRate = this.getSettings().rate || 1.0;
    const matchIdx = this.speedOptions.indexOf(currentRate);
    this.currentSpeedIndex = matchIdx >= 0 ? matchIdx : this.speedOptions.indexOf(1.0);
  }

  mount(parentEl: HTMLElement = document.body) {
    if (this.containerEl) return;

    this.containerEl = parentEl.createDiv({ cls: "speech-craft-pill hidden" });
    this.buildUI(this.containerEl);

    this.unsubscribe = this.ttsManager.onStatusChange((status) => {
      this.updateStatus(status);
    });
  }

  unmount() {
    this.unsubscribe?.();
    this.containerEl?.remove();
    this.containerEl = null;
  }

  updateSettings(settings: SpeechCraftSettings) {
    const currentRate = settings.rate || 1.0;
    const matchIdx = this.speedOptions.indexOf(currentRate);
    this.currentSpeedIndex = matchIdx >= 0 ? matchIdx : this.speedOptions.indexOf(1.0);
    this.updateSpeedText();
  }

  public onJumpRequest?: () => void;
  public onVisibilityChange?: (visible: boolean) => void;

  isBarVisible(): boolean {
    return this.isVisible;
  }

  show() {
    if (!this.containerEl) return;
    this.containerEl.removeClass("hidden");
    const changed = !this.isVisible;
    this.isVisible = true;
    if (changed) {
      this.onVisibilityChange?.(true);
    }
  }

  hide() {
    if (!this.containerEl) return;
    this.containerEl.addClass("hidden");
    const changed = this.isVisible;
    this.isVisible = false;
    if (changed) {
      this.onVisibilityChange?.(false);
    }
  }

  private buildUI(el: HTMLElement) {
    // 1. Progress Track & Slider + Time (Row 1 on mobile, center section on desktop)
    const progressGroup = el.createDiv({ cls: "sc-pill-progress-group" });
    this.progressSlider = progressGroup.createEl("input", {
      type: "range",
      cls: "sc-pill-slider",
      value: "0"
    });
    this.progressSlider.min = "0";
    this.progressSlider.max = "100";
    this.progressSlider.step = "0.5";

    this.progressSlider.oninput = (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.progressSlider?.style.setProperty("--slider-progress", `${val}%`);
      const status = this.ttsManager.getStatus();
      if (status.duration > 0) {
        this.ttsManager.seek((val / 100) * status.duration);
      }
    };

    // Time Display (guaranteed no truncate)
    this.timeDisplay = progressGroup.createSpan({
      cls: "sc-pill-time",
      text: "00:00 / 00:00"
    });

    // Dividers for desktop layout
    el.createDiv({ cls: "sc-pill-divider sc-pill-divider-desktop-1" });
    el.createDiv({ cls: "sc-pill-divider sc-pill-divider-desktop-2" });

    // 2. Controls Row (Row 2 on mobile, wraps badge + playback + trailing controls)
    const controlsRow = el.createDiv({ cls: "sc-pill-controls-row" });

    // 2a. Language badge & Segment progress counter
    const badgeGroup = controlsRow.createDiv({ cls: "sc-pill-badge-group" });
    this.langBadge = badgeGroup.createSpan({
      cls: "sc-pill-badge sc-pill-badge-clickable",
      text: "EN",
      attr: {
        role: "button",
        tabindex: "0",
        "aria-label": "Language: English (Click to switch to Hindi)",
        title: "Language: English (Click to switch to Hindi)"
      }
    });
    this.langBadge.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.ttsManager.toggleCurrentLanguage();
    };
    this.langBadge.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.ttsManager.toggleCurrentLanguage();
      }
    };
    this.segmentCounter = badgeGroup.createSpan({
      cls: "sc-pill-counter sc-pill-counter-clickable",
      text: "¶ 1/1",
      attr: {
        "aria-label": "Paragraph 1 of 1",
        title: "Paragraph 1 of 1 (Click to jump to paragraph)"
      }
    });
    this.segmentCounter.onclick = () => {
      this.onJumpRequest?.();
    };

    // 2b. Playback Controls group
    const controls = controlsRow.createDiv({ cls: "sc-pill-controls" });

    // Previous Button (Left click: Previous Sentence | Right click: Previous Paragraph)
    this.prevBtn = controls.createEl("button", {
      cls: "sc-pill-btn sc-pill-btn-nav",
      attr: {
        "aria-label": "Previous sentence (Alt+Left)",
        title: "Previous sentence (Alt+Left) | Right-click: Previous paragraph"
      }
    });
    setIcon(this.prevBtn, "chevron-left");
    this.prevBtn.onclick = () => this.ttsManager.previousSentence();
    this.prevBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.ttsManager.previous();
    });

    // Play / Pause Button
    this.playPauseBtn = controls.createEl("button", {
      cls: "sc-pill-btn sc-pill-btn-play",
      attr: { "aria-label": "Play / Pause" }
    });
    setIcon(this.playPauseBtn, "play");
    this.playPauseBtn.onclick = () => this.ttsManager.togglePlayPause();

    // Next Button (Left click: Next Sentence | Right click: Next Paragraph)
    this.nextBtn = controls.createEl("button", {
      cls: "sc-pill-btn sc-pill-btn-nav",
      attr: {
        "aria-label": "Next sentence (Alt+Right)",
        title: "Next sentence (Alt+Right) | Right-click: Next paragraph"
      }
    });
    setIcon(this.nextBtn, "chevron-right");
    this.nextBtn.onclick = () => this.ttsManager.nextSentence();
    this.nextBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.ttsManager.next();
    });

    // Stop Button
    this.stopBtn = controls.createEl("button", {
      cls: "sc-pill-btn sc-pill-btn-nav",
      attr: { "aria-label": "Stop" }
    });
    setIcon(this.stopBtn, "square");
    this.stopBtn.onclick = () => {
      this.ttsManager.stop();
      this.hide();
    };

    // 2c. Trailing group (Speed & Close)
    const trailingGroup = controlsRow.createDiv({ cls: "sc-pill-trailing-group" });

    // Speed Pill Button (Left-click increases, Right-click decreases)
    this.speedBtn = trailingGroup.createEl("button", {
      cls: "sc-pill-speed",
      attr: {
        "aria-label": "Playback speed (Left click: Increase, Right click: Decrease)",
        title: "Left-click: Increase speed | Right-click: Decrease speed"
      }
    });
    this.updateSpeedText();

    this.speedBtn.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      this.increaseSpeed();
    });

    this.speedBtn.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.decreaseSpeed();
    });

    // Close Button (Default Obsidian "x" icon)
    const closeBtn = trailingGroup.createEl("button", {
      cls: "sc-pill-btn sc-pill-close",
      attr: { "aria-label": "Close player", title: "Close player" }
    });
    setIcon(closeBtn, "x");
    closeBtn.onclick = () => {
      this.ttsManager.stop();
      this.hide();
    };
  }

  private increaseSpeed() {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedOptions.length;
    const rate = this.speedOptions[this.currentSpeedIndex];
    this.ttsManager.setRate(rate);
    this.updateSpeedText();
    this.onRateChange?.(rate);
  }

  private decreaseSpeed() {
    this.currentSpeedIndex =
      (this.currentSpeedIndex - 1 + this.speedOptions.length) % this.speedOptions.length;
    const rate = this.speedOptions[this.currentSpeedIndex];
    this.ttsManager.setRate(rate);
    this.updateSpeedText();
    this.onRateChange?.(rate);
  }

  private updateSpeedText() {
    if (this.speedBtn) {
      const rate = this.speedOptions[this.currentSpeedIndex];
      this.speedBtn.setText(`${rate}x`);
    }
  }

  private updateStatus(status: AudioPlaybackStatus) {
    if (status.state === "idle") {
      if (this.isVisible) {
        this.hide();
      }
      return;
    }

    if (!this.isVisible) {
      this.show();
    }

    // Play/Pause icon update
    if (this.playPauseBtn && this.currentState !== status.state) {
      this.currentState = status.state;
      this.playPauseBtn.empty();
      if (status.state === "loading") {
        setIcon(this.playPauseBtn, "loader-2");
        this.playPauseBtn.addClass("sc-spin");
      } else if (status.state === "playing") {
        setIcon(this.playPauseBtn, "pause");
        this.playPauseBtn.removeClass("sc-spin");
      } else {
        setIcon(this.playPauseBtn, "play");
        this.playPauseBtn.removeClass("sc-spin");
      }
    }

    // Language badge
    if (this.langBadge && status.activeSegment) {
      if (status.activeSegment.lang === "hi") {
        this.langBadge.setText("HI");
        this.langBadge.addClass("sc-badge-hi");
        this.langBadge.setAttribute("title", "Language: Hindi (Click to switch to English)");
        this.langBadge.setAttribute("aria-label", "Language: Hindi (Click to switch to English)");
      } else {
        this.langBadge.setText("EN");
        this.langBadge.removeClass("sc-badge-hi");
        this.langBadge.setAttribute("title", "Language: English (Click to switch to Hindi)");
        this.langBadge.setAttribute("aria-label", "Language: English (Click to switch to Hindi)");
      }
    }

    // Segment progress counter (Paragraph-wise: e.g. ¶ 1/25)
    if (this.segmentCounter) {
      const current = status.totalSegments > 0 ? status.currentSegmentIndex + 1 : 0;
      this.segmentCounter.setText(`¶ ${current}/${status.totalSegments}`);
      this.segmentCounter.setAttribute(
        "title",
        `Paragraph ${current} of ${status.totalSegments} (Click to jump to paragraph)`
      );
      this.segmentCounter.setAttribute(
        "aria-label",
        `Paragraph ${current} of ${status.totalSegments}`
      );
    }

    // Time & slider
    if (this.timeDisplay) {
      const cur = formatSeconds(status.currentTime);
      const total = status.duration > 0 ? formatSeconds(status.duration) : "00:00";
      this.timeDisplay.setText(`${cur} / ${total}`);
    }

    if (this.progressSlider && status.duration > 0) {
      const percent = Math.min(100, Math.max(0, (status.currentTime / status.duration) * 100));
      this.progressSlider.value = percent.toFixed(1);
      this.progressSlider.style.setProperty("--slider-progress", `${percent.toFixed(1)}%`);
    }
  }
}
