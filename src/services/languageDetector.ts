export type DetectedLanguage = 'hi' | 'en' | 'other';

/**
 * Detects whether the primary language of the text is Hindi (Devanagari) or English/Latin.
 */
export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length === 0) {
    return 'en';
  }

  // Devanagari Unicode Block: U+0900 to U+097F
  const devanagariMatches = text.match(/[\u0900-\u097F]/g);
  const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;

  // Latin letters
  const latinMatches = text.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;

  if (devanagariCount > 0) {
    if (latinCount === 0 || devanagariCount >= latinCount || devanagariCount > 3) {
      return 'hi';
    }
  }

  return 'en';
}

/**
 * Splits a long clause or sentence into manageable chunks using secondary boundaries
 * (semicolons, colons, em/en dashes, commas, or words) so TTS engines and WebSpeech don't choke.
 */
function splitLongClause(text: string, maxLen: number = 320): string[] {
  if (text.length <= maxLen) return [text];

  // 1. Try splitting at semicolons, colons, or em/en dashes
  const clauseRegex = /.*?[;:—–]+['"”’»\)\]]*(?=\s|$)|.+$/gu;
  const clauseMatches = text.match(clauseRegex);

  if (clauseMatches && clauseMatches.length > 1) {
    const res: string[] = [];
    for (const cm of clauseMatches) {
      const t = cm.trim();
      if (t.length > maxLen) {
        res.push(...splitByCommaOrWords(t, maxLen));
      } else if (t.length > 0) {
        res.push(t);
      }
    }
    if (res.length > 0) return res;
  }

  return splitByCommaOrWords(text, maxLen);
}

function splitByCommaOrWords(text: string, maxLen: number = 320): string[] {
  if (text.length <= maxLen) return [text];

  // 2. Try splitting by commas
  const commaRegex = /.*?,+['"”’»\)\]]*(?=\s|$)|.+$/gu;
  const commaMatches = text.match(commaRegex);
  if (commaMatches && commaMatches.length > 1) {
    const res: string[] = [];
    let current = "";
    for (const cm of commaMatches) {
      const t = cm.trim();
      if ((current + " " + t).trim().length > maxLen && current.length > 0) {
        res.push(current.trim());
        current = t;
      } else {
        current = current ? current + " " + t : t;
      }
    }
    if (current.trim().length > 0) {
      res.push(current.trim());
    }
    if (res.length > 1) return res;
  }

  // 3. Natural word-boundary fallback
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Splits a paragraph into individual sentences.
 * Recognizes Hindi Purna Viram (। and ॥), standard punctuation (. ! ?), Arabic/Urdu (؟ ، ۔),
 * and handles terminal punctuation enclosed in quotes or parentheses.
 * Also intelligently decomposes run-on or unpunctuated paragraphs into natural clause units.
 */
export function splitParagraphIntoSentences(para: string): string[] {
  if (!para) return [];

  // Matches sentences ending with terminal punctuation [.!?।॥؟۔]
  // followed by optional closing quotation marks or brackets ['"”’»\)\]]*
  // followed by whitespace or end of line.
  const sentenceRegex = /.*?[.!?।॥؟۔]+['"”’»\)\]]*(?=\s|$)|.+$/gu;
  const matches = para.match(sentenceRegex) || [para];
  const sentences: string[] = [];

  for (const s of matches) {
    const trimmed = s.trim();
    if (trimmed.length > 0 && !/^[\s.!?।॥؟۔'"”’»\)\]]+$/.test(trimmed)) {
      sentences.push(trimmed);
    }
  }

  const baseSentences = sentences.length > 0 ? sentences : [para.trim()];

  // Refine any sentences that are excessively long (> 350 chars), or break down unpunctuated paragraphs
  const refined: string[] = [];
  for (const sent of baseSentences) {
    if (sent.length > 350) {
      refined.push(...splitLongClause(sent, 320));
    } else {
      refined.push(sent);
    }
  }

  return refined.length > 0 ? refined : [para.trim()];
}

export interface ParagraphSegmentData {
  text: string;
  sentences: string[];
}

/**
 * Splits text into paragraph units for natural playback and UI counter (e.g. 1/25 paragraphs),
 * while keeping sentence-level breakdown for precise live sentence highlighting.
 */
export function splitIntoParagraphSegments(text: string): ParagraphSegmentData[] {
  if (!text) return [];

  const rawParagraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const results: ParagraphSegmentData[] = [];

  for (const para of rawParagraphs) {
    const sentences = splitParagraphIntoSentences(para);

    // If paragraph is long (> 700 characters) or has many sentences, safely group into digestible sub-segments
    if ((para.length > 700 || sentences.length > 4) && sentences.length > 1) {
      let currentSentences: string[] = [];
      let currentLen = 0;

      for (const sent of sentences) {
        if (currentLen + sent.length > 600 && currentSentences.length > 0) {
          results.push({
            text: currentSentences.join(" "),
            sentences: currentSentences
          });
          currentSentences = [sent];
          currentLen = sent.length;
        } else {
          currentSentences.push(sent);
          currentLen += sent.length;
        }
      }

      if (currentSentences.length > 0) {
        results.push({
          text: currentSentences.join(" "),
          sentences: currentSentences
        });
      }
    } else {
      results.push({
        text: para,
        sentences
      });
    }
  }

  return results;
}
