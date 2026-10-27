import { App, Modal, Setting } from "obsidian";
import { SpeechSegment } from "../types";

export class JumpToParagraphModal extends Modal {
  private filterQuery: string = "";

  constructor(
    app: App,
    private segments: SpeechSegment[],
    private currentIndex: number,
    private onJump: (targetIndex: number) => void,
    private onCloseCallback?: () => void
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sc-jump-modal");

    // Modal Header
    const header = contentEl.createDiv({ cls: "sc-jump-header" });
    header.createEl("h2", { text: "Jump to Paragraph" });
    header.createEl("p", {
      cls: "setting-item-description",
      text: `Currently reading Paragraph ${this.currentIndex + 1} of ${this.segments.length}`
    });

    // 1. Direct Number Input row
    const directRow = contentEl.createDiv({ cls: "sc-jump-direct-row" });
    let inputElRef: HTMLInputElement | null = null;

    new Setting(directRow)
      .setName("Go to paragraph number:")
      .setDesc(`Enter any number from 1 to ${this.segments.length} and press Enter`)
      .addText((text) => {
        inputElRef = text.inputEl;
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = `${this.segments.length}`;
        text.setValue(`${this.currentIndex + 1}`);
        text.inputEl.style.width = "90px";
        text.inputEl.style.textAlign = "center";
        text.inputEl.style.fontWeight = "bold";

        text.inputEl.onkeydown = (e) => {
          if (e.key === "Enter") {
            const num = parseInt(text.getValue().trim(), 10);
            if (!isNaN(num) && num >= 1 && num <= this.segments.length) {
              this.close();
              this.onJump(num - 1);
            }
          }
        };
      })
      .addButton((btn) => {
        btn.setButtonText("Jump (Enter)")
          .setCta()
          .onClick(() => {
            const num = parseInt(inputElRef?.value || "1", 10);
            if (!isNaN(num) && num >= 1 && num <= this.segments.length) {
              this.close();
              this.onJump(num - 1);
            }
          });
      });

    // Auto-focus the number input
    setTimeout(() => {
      inputElRef?.focus();
      inputElRef?.select();
    }, 50);

    // 2. Search / Filter Box
    const searchRow = contentEl.createDiv({ cls: "sc-jump-search-row" });
    const searchInput = searchRow.createEl("input", {
      type: "text",
      cls: "sc-jump-search-input",
      placeholder: "Filter paragraphs by text or number..."
    });

    // 3. Scrollable Paragraph List
    const listContainer = contentEl.createDiv({ cls: "sc-jump-list-container" });

    const renderList = () => {
      listContainer.empty();
      const q = this.filterQuery.toLowerCase().trim();

      const filtered = this.segments
        .map((seg, idx) => ({ seg, idx }))
        .filter(({ seg, idx }) => {
          if (!q) return true;
          return (
            `¶ ${idx + 1}`.includes(q) ||
            `${idx + 1}` === q ||
            seg.cleanText.toLowerCase().includes(q)
          );
        });

      if (filtered.length === 0) {
        listContainer.createDiv({
          cls: "sc-jump-empty",
          text: "No matching paragraphs found."
        });
        return;
      }

      for (const { seg, idx } of filtered) {
        const isCurrent = idx === this.currentIndex;
        const item = listContainer.createDiv({
          cls: `sc-jump-item ${isCurrent ? "is-active" : ""}`
        });

        // Badge
        item.createSpan({
          cls: "sc-jump-item-badge",
          text: `¶ ${idx + 1}`
        });

        // Snippet preview (cleaned text trimmed to 140 chars)
        item.createSpan({
          cls: "sc-jump-item-preview",
          text: seg.cleanText.slice(0, 140) + (seg.cleanText.length > 140 ? "..." : "")
        });

        item.onclick = () => {
          this.close();
          this.onJump(idx);
        };

        if (isCurrent && !q) {
          setTimeout(() => item.scrollIntoView({ block: "center" }), 60);
        }
      }
    };

    searchInput.oninput = (e) => {
      this.filterQuery = (e.target as HTMLInputElement).value;
      renderList();
    };

    renderList();
  }

  onClose() {
    this.contentEl.empty();
    this.onCloseCallback?.();
  }
}
