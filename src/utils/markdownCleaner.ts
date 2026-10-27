export interface CleanerOptions {
  skipFrontmatter?: boolean;
  skipCodeBlocks?: boolean;
}

/**
 * Strips markdown and HTML formatting so text is natural and smooth for TTS engines.
 */
export function cleanMarkdownForTTS(text: string, options: CleanerOptions = {}): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Strip YAML frontmatter
  if (options.skipFrontmatter !== false) {
    cleaned = cleaned.replace(/^---[\s\S]*?---\s*/, "");
  }

  // 2. Strip code blocks
  if (options.skipCodeBlocks !== false) {
    // Remove multi-line code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
    // Remove inline code snippets
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  }

  // 3. Strip HTML comments & tags
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // 4. Strip math blocks
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, "");
  cleaned = cleaned.replace(/\$([^\$\n]+)\$/g, "$1");

  // 5. Strip images: ![[image.png]] or ![alt](url)
  cleaned = cleaned.replace(/!\[\[([^\]]+)\]\]/g, "");
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "");

  // 6. Convert Wikilinks: [[note|alias]] -> alias, [[note]] -> note
  cleaned = cleaned.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1");

  // 7. Convert Markdown links: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // 8. Strip task list checkboxes: "- [ ] " or "- [x] "
  cleaned = cleaned.replace(/^[\s]*[-*+]\s*\[[ xX]\]\s*/gm, "");

  // 9. Strip list bullets and blockquote markers: "* ", "- ", "+ ", "> "
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^[\s]*>\s*/gm, "");

  // 10. Strip heading markers: "# ", "## ", etc.
  cleaned = cleaned.replace(/^[\s]*#{1,6}\s+/gm, "");

  // 11. Strip horizontal rules
  cleaned = cleaned.replace(/^[\s]*[-*_]{3,}\s*$/gm, "");

  // 12. Strip emphasis formatting: ***bold-italic***, **bold**, *italic*, __bold__, _italic_, ~~strike~~, ==highlight==
  cleaned = cleaned.replace(/[*_]{3}([^*_]+)[*_]{3}/g, "$1");
  cleaned = cleaned.replace(/[*_]{2}([^*_]+)[*_]{2}/g, "$1");
  cleaned = cleaned.replace(/[*_]([^*_]+)[*_]/g, "$1");
  cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");
  cleaned = cleaned.replace(/==([^=]+)==/g, "$1");

  // 13. Strip footnotes [^1]
  cleaned = cleaned.replace(/\[\^[^\]]+\]/g, "");

  // 14. Clean excess whitespace while preserving paragraph flow
  cleaned = cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

  // 15. Normalize punctuation spacing so TTS engines do not blend words
  cleaned = normalizePunctuationSpacing(cleaned);

  return cleaned;
}

/**
 * Normalizes punctuation and spacing so TTS engines do not blend words together.
 * Resolves commas jammed into words ("शब्द,शब्द" -> "शब्द, शब्द"),
 * unspaced dashes ("शब्द—शब्द" -> "शब्द — शब्द"), and quotation marks.
 */
export function normalizePunctuationSpacing(text: string): string {
  if (!text) return "";

  let res = text;

  // 1. Remove space before comma: "word , word" -> "word, word"
  res = res.replace(/[ \t]+,/g, ",");

  // 2. Enforce space after comma unless between digits (e.g., 1,000 or 3,14)
  res = res.replace(/,([^\s\d"'’”»\)])/g, ", $1");

  // 3. Enforce space after semicolons and colons (avoid URLs like http:// or https://)
  res = res.replace(/;([^\s])/g, "; $1");
  res = res.replace(/(?<!https?):([^\s\/\d])/g, ": $1");

  // 4. Enforce space after Hindi purna viram (। / ॥) and sentence terminals if followed by another word
  res = res.replace(/([।॥!?])([^\s"'’”»\d\)])/g, "$1 $2");

  // 5. Ensure em-dashes and en-dashes have breathing room so words don't stick to them
  res = res.replace(/([^\s])([—–])([^\s])/g, "$1 $2 $3");
  res = res.replace(/([^\s])--([^\s])/g, "$1 -- $2");

  // 6. Ensure proper breathing space around quotes and commas without deleting quotation marks
  res = res.replace(/,([\"'“”])/g, ", $1");
  res = res.replace(/(['"“”]),([^\s])/g, "$1, $2");
  res = res.replace(/([.!?।॥]['"”’»\)\]])([^\s\d"'’”»\)])/gu, "$1 $2");

  // 7. Collapse any resulting multiple horizontal spaces into a single space
  res = res.replace(/[ \t]+/g, " ");

  return res.trim();
}

