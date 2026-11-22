import { describe, expect, it } from "vitest";
import { formatMarkdown } from "./markdown-formatting";

describe("blog Markdown toolbar", () => {
  it("wraps selected text in bold markers", () => {
    expect(formatMarkdown("A story", 2, 7, "bold")).toEqual({
      text: "A **story**", selectionStart: 4, selectionEnd: 9,
    });
  });

  it("inserts an editable placeholder when selection is empty", () => {
    expect(formatMarkdown("", 0, 0, "link")).toEqual({
      text: "[link text](https://example.com)", selectionStart: 1, selectionEnd: 10,
    });
  });

  it("formats the beginning of the current line as a heading", () => {
    expect(formatMarkdown("Intro\nStory", 8, 8, "heading")).toEqual({
      text: "Intro\n## Story", selectionStart: 11, selectionEnd: 11,
    });
  });

  it("avoids duplicate list markers and preserves the caret", () => {
    expect(formatMarkdown("- Item", 2, 2, "list")).toEqual({
      text: "- Item", selectionStart: 2, selectionEnd: 2,
    });
  });

  it("allows an empty article to start a list", () => {
    expect(formatMarkdown("", 0, 0, "list")).toEqual({
      text: "- ", selectionStart: 2, selectionEnd: 2,
    });
  });
});
