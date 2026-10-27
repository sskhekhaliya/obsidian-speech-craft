import { App, Editor, MarkdownView } from "obsidian";
import { cleanMarkdownForTTS } from "../utils/markdownCleaner";
import { detectLanguage, splitIntoParagraphSegments, splitParagraphIntoSentences } from "./languageDetector";
import { SentenceSpan, SpeechSegment, SpeechCraftSettings } from "../types";

export interface ExtractedSpeech {
  sourceType: "selection" | "cursor-onward" | "full-note";
  segments: SpeechSegment[];
  rawText: string;
}

export class TextExtractor {
  constructor(private app: App, private getSettings: () => SpeechCraftSettings) {}

  extractFromActiveView(editor?: Editor): ExtractedSpeech | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const activeEditor = editor || view?.editor;

    if (!activeEditor) {
      return null;
    }

    const settings = this.getSettings();
    const selection = activeEditor.getSelection();

    let textToRead = "";
    let sourceType: ExtractedSpeech["sourceType"] = "full-note";
    let baseOffset = 0;

    // 1. If text is selected, speak the selection
    if (selection && selection.trim().length > 0) {
      textToRead = selection;
      sourceType = "selection";
      try {
        baseOffset = activeEditor.posToOffset(activeEditor.getCursor("from"));
      } catch {
        baseOffset = 0;
      }
    } else {
      // 2. Otherwise speak the whole note from top to bottom
      textToRead = activeEditor.getValue();
      sourceType = "full-note";
      baseOffset = 0;
    }

    if (!textToRead || textToRead.trim().length === 0) {
      return null;
    }

    // 1. Split textToRead into raw blocks by blank lines while tracking EXACT offsets in textToRead
    const rawBlocks: { rawText: string; docFrom: number; docTo: number }[] = [];
    const blockRegex = /(?:\r?\n\s*){2,}/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = blockRegex.exec(textToRead)) !== null) {
      const raw = textToRead.slice(lastIndex, match.index);
      if (raw.trim().length > 0) {
        const trimmedStart = raw.search(/\S/);
        const trimmedEnd = raw.search(/\s+$/);
        const from = lastIndex + (trimmedStart >= 0 ? trimmedStart : 0);
        const to = trimmedEnd >= 0 ? lastIndex + trimmedEnd : match.index;

        rawBlocks.push({
          rawText: raw.trim(),
          docFrom: baseOffset + from,
          docTo: baseOffset + to
        });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < textToRead.length) {
      const raw = textToRead.slice(lastIndex);
      if (raw.trim().length > 0) {
        const trimmedStart = raw.search(/\S/);
        const trimmedEnd = raw.search(/\s+$/);
        const from = lastIndex + (trimmedStart >= 0 ? trimmedStart : 0);
        const to = trimmedEnd >= 0 ? lastIndex + trimmedEnd : textToRead.length;

        rawBlocks.push({
          rawText: raw.trim(),
          docFrom: baseOffset + from,
          docTo: baseOffset + to
        });
      }
    }

    // 2. Filter out non-speech blocks (YAML, code blocks, images) and clean each block
    const segments: SpeechSegment[] = [];

    for (let i = 0; i < rawBlocks.length; i++) {
      const block = rawBlocks[i];

      // Skip YAML frontmatter if requested
      if (settings.skipFrontmatter && block.rawText.startsWith("---") && block.rawText.endsWith("---")) {
        continue;
      }
      // Skip pure code blocks if requested
      if (settings.skipCodeBlocks && block.rawText.startsWith("```") && block.rawText.endsWith("```")) {
        continue;
      }
      // Skip pure image blocks (![[...]] or ![...](...))
      const isPureImage =
        (block.rawText.startsWith("![[") && block.rawText.endsWith("]]")) ||
        (block.rawText.startsWith("![") && block.rawText.endsWith(")"));
      if (isPureImage) {
        continue;
      }

      // Clean this block for TTS
      const cleaned = cleanMarkdownForTTS(block.rawText, {
        skipFrontmatter: false,
        skipCodeBlocks: settings.skipCodeBlocks
      });

      if (!cleaned || cleaned.trim().length === 0) {
        continue;
      }

      const lang = detectLanguage(cleaned);
      let chosenVoice: string | undefined;
      if (settings.autoDetectLanguage) {
        chosenVoice = lang === "hi" ? settings.defaultHindiVoice : settings.defaultEnglishVoice;
      } else {
        chosenVoice = settings.defaultEnglishVoice;
      }

      // Extract sentences inside this block
      const sentences = splitParagraphIntoSentences(cleaned);
      const sentenceSpans: SentenceSpan[] = [];

      let sentSearchCursor = block.docFrom - baseOffset;

      for (const sent of sentences) {
        const isEndOfSentence = /[.!?।॥؟۔]/.test(sent);
        const pauseWeight = isEndOfSentence ? 14 : 4;
        const weight = Math.max(1, sent.length + pauseWeight);

        let sFrom = baseOffset + sentSearchCursor;
        let sTo = baseOffset + sentSearchCursor + sent.length;

        // Try locating the prefix in rawText for exact highlight offset
        const sPrefix = sent.slice(0, Math.min(15, sent.length)).trim();
        if (sPrefix.length > 0) {
          let found = textToRead.indexOf(sPrefix, sentSearchCursor);
          if (found === -1) {
            const strippedPrefix = sPrefix.replace(/^['"“‘(]+/, "").slice(0, 10).trim();
            if (strippedPrefix.length > 2) {
              found = textToRead.indexOf(strippedPrefix, sentSearchCursor);
            }
          }
          if (found !== -1 && found < block.docTo - baseOffset) {
            sFrom = baseOffset + found;
            sTo = Math.min(block.docTo, sFrom + sent.length);
            sentSearchCursor = sTo - baseOffset;
          }
        }

        sentenceSpans.push({
          text: sent,
          cleanText: sent,
          docFrom: sFrom,
          docTo: sTo,
          weight,
          startRatio: 0,
          endRatio: 1
        });
      }

      // Calculate sentence ratios across the paragraph
      const totalWeight = sentenceSpans.reduce((acc, s) => acc + s.weight, 0);
      let accumulatedWeight = 0;
      for (const span of sentenceSpans) {
        span.startRatio = totalWeight > 0 ? accumulatedWeight / totalWeight : 0;
        accumulatedWeight += span.weight;
        span.endRatio = totalWeight > 0 ? accumulatedWeight / totalWeight : 1;
      }

      // Exactly 1 paragraph block = 1 SpeechSegment (one paragraph, one audio)
      segments.push({
        id: `para-${segments.length}-${Date.now()}`,
        originalText: block.rawText,
        cleanText: cleaned,
        lang,
        voiceId: chosenVoice,
        docFrom: block.docFrom,
        docTo: block.docTo,
        sentences: sentenceSpans
      });
    }

    return {
      sourceType,
      segments,
      rawText: textToRead
    };
  }

  /**
   * Finds the segment and specific sentence matching a document character offset
   */
  findSegmentAndSentenceAtOffset(
    segments: SpeechSegment[],
    offset: number
  ): { segmentIndex: number; startRatio: number; sentence?: SentenceSpan } {
    if (segments.length === 0) {
      return { segmentIndex: 0, startRatio: 0 };
    }

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      // 1. If offset is before or at the start of this segment
      if (seg.docFrom !== undefined && offset <= seg.docFrom) {
        return {
          segmentIndex: i,
          startRatio: 0,
          sentence: seg.sentences?.[0]
        };
      }

      // 2. If offset is inside this segment
      if (
        seg.docFrom !== undefined &&
        seg.docTo !== undefined &&
        offset >= seg.docFrom &&
        offset <= seg.docTo
      ) {
        if (seg.sentences && seg.sentences.length > 0) {
          for (let s = 0; s < seg.sentences.length; s++) {
            const sent = seg.sentences[s];
            const nextSent = seg.sentences[s + 1];
            const sEnd = nextSent?.docFrom !== undefined ? nextSent.docFrom : (sent.docTo !== undefined ? sent.docTo + 1 : seg.docTo);
            if (
              sent.docFrom !== undefined &&
              offset >= sent.docFrom &&
              offset < sEnd
            ) {
              return {
                segmentIndex: i,
                startRatio: sent.startRatio,
                sentence: sent
              };
            }
          }
        }
        return { segmentIndex: i, startRatio: 0, sentence: seg.sentences?.[0] };
      }

      // 3. If offset is between this segment and the next (e.g. blank line or image in between)
      const nextSeg = segments[i + 1];
      if (
        seg.docTo !== undefined &&
        offset > seg.docTo &&
        nextSeg &&
        nextSeg.docFrom !== undefined &&
        offset <= nextSeg.docFrom
      ) {
        return {
          segmentIndex: i + 1,
          startRatio: 0,
          sentence: nextSeg.sentences?.[0]
        };
      }
    }

    // Default to the last segment
    const lastIdx = segments.length - 1;
    return {
      segmentIndex: lastIdx,
      startRatio: 0,
      sentence: segments[lastIdx].sentences?.[0]
    };
  }

  /**
   * Finds the segment index matching a specific document character offset
   */
  findSegmentIndexAtOffset(segments: SpeechSegment[], offset: number): number {
    return this.findSegmentAndSentenceAtOffset(segments, offset).segmentIndex;
  }
}
