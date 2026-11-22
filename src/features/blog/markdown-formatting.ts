export type MarkdownFormat = "heading" | "bold" | "italic" | "link" | "list";

export type MarkdownEdit = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
};

/** Apply Markdown at the current textarea selection without losing the caret. */
export function formatMarkdown(
  text: string, selectionStart: number, selectionEnd: number, format: MarkdownFormat,
): MarkdownEdit {
  const start = Math.max(0, Math.min(text.length, selectionStart));
  const end = Math.max(start, Math.min(text.length, selectionEnd));

  if (format === "heading" || format === "list") {
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const marker = format === "heading" ? "## " : "- ";
    if (text.slice(lineStart).startsWith(marker)) {
      return { text, selectionStart: start, selectionEnd: end };
    }
    return {
      text: text.slice(0, lineStart) + marker + text.slice(lineStart),
      selectionStart: start + marker.length,
      selectionEnd: end + marker.length,
    };
  }

  const selected = text.slice(start, end);
  const content = selected || (format === "link" ? "link text" : format === "bold" ? "bold text" : "italic text");
  const before = format === "link" ? "[" : format === "bold" ? "**" : "*";
  const after = format === "link" ? "](https://example.com)" : format === "bold" ? "**" : "*";
  return {
    text: text.slice(0, start) + before + content + after + text.slice(end),
    selectionStart: start + before.length,
    selectionEnd: start + before.length + content.length,
  };
}
