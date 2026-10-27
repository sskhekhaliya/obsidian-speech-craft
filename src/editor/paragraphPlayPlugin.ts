import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from "@codemirror/view";
import { setIcon } from "obsidian";
import SpeechCraftPlugin from "../main";

export class ParagraphPlayWidget extends WidgetType {
  constructor(private pos: number, private plugin: SpeechCraftPlugin) {
    super();
  }

  eq(other: ParagraphPlayWidget) {
    return this.pos === other.pos;
  }

  toDOM() {
    const btn = document.createElement("span");
    btn.className = "sc-para-play-btn";
    btn.setAttribute("aria-label", "Play from this paragraph");
    btn.setAttribute("title", "Play from this paragraph");

    setIcon(btn, "play");

    btn.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.plugin.speakFromOffset(this.pos);
    };

    return btn;
  }

  ignoreEvent() {
    return false;
  }
}

export function createParagraphPlayExtension(plugin: SpeechCraftPlugin) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.geometryChanged
        ) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        if (!plugin.settings.showParagraphHoverPlay) {
          return Decoration.none;
        }

        const builder = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc;

        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          while (pos <= to) {
            const line = doc.lineAt(pos);
            const lineText = line.text.trim();

            const isImage = lineText.startsWith("![[") || lineText.startsWith("![") || lineText.startsWith("<img");

            if (
              lineText.length > 0 &&
              !isImage &&
              !lineText.startsWith("```") &&
              !lineText.startsWith("---") &&
              !lineText.startsWith("<!--")
            ) {
              // A line is the start of a paragraph if:
              // 1. It is the first line of the document
              // 2. OR the previous line was empty, an image, code block fence, or YAML closing "---"
              let isParaStart = false;
              if (line.number === 1) {
                isParaStart = true;
              } else {
                const prevLine = doc.line(line.number - 1);
                const prevTrimmed = prevLine.text.trim();
                const prevIsImage = prevTrimmed.startsWith("![[") || prevTrimmed.startsWith("![") || prevTrimmed.startsWith("<img");
                const prevIsCodeOrRule = prevTrimmed.startsWith("```") || prevTrimmed === "---";
                if (prevTrimmed.length === 0 || prevIsImage || prevIsCodeOrRule) {
                  isParaStart = true;
                }
              }

              if (isParaStart) {
                builder.add(
                  line.from,
                  line.from,
                  Decoration.widget({
                    widget: new ParagraphPlayWidget(line.from, plugin),
                    side: -1
                  })
                );
              }
            }

            pos = line.to + 1;
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations
    }
  );
}
