import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { App, MarkdownView } from "obsidian";

export interface HighlightRange {
  from: number;
  to: number;
}

export const setSpeechHighlight = StateEffect.define<HighlightRange | null>();

export const speechHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setSpeechHighlight)) {
        if (!e.value) {
          return Decoration.none;
        }
        return Decoration.set([
          Decoration.mark({
            class: "speech-craft-karaoke-highlight"
          }).range(e.value.from, e.value.to)
        ]);
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});

/**
 * Applies the karaoke highlight to the currently active markdown view
 */
export function applyHighlightToActiveView(app: App, from: number, to: number) {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) return;

  // @ts-ignore - access inner CodeMirror 6 EditorView
  const cmView: EditorView | undefined = view.editor?.cm;
  if (!cmView) return;

  const docLength = cmView.state.doc.length;
  const clampedFrom = Math.max(0, Math.min(from, docLength));
  const clampedTo = Math.max(clampedFrom, Math.min(to, docLength));

  if (clampedFrom === clampedTo) return;

  cmView.dispatch({
    effects: setSpeechHighlight.of({ from: clampedFrom, to: clampedTo })
  });

  // Smoothly center the active sentence into the editor view
  try {
    const fromPos = view.editor.offsetToPos(clampedFrom);
    const toPos = view.editor.offsetToPos(clampedTo);
    view.editor.scrollIntoView({ from: fromPos, to: toPos }, true);
  } catch {}
}

/**
 * Clears the karaoke highlight from the active view
 */
export function clearHighlightFromActiveView(app: App) {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) return;

  // @ts-ignore
  const cmView: EditorView | undefined = view.editor?.cm;
  if (!cmView) return;

  cmView.dispatch({
    effects: setSpeechHighlight.of(null)
  });
}
