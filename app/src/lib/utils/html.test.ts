import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  htmlLooksEscaped,
  htmlLooksLikeMarkup,
  normalizeStoredRichText,
  sanitizeRichTextHtml,
  stripHtml,
} from "@/lib/utils/html";

describe("decodeHtmlEntities", () => {
  it("decodes escaped tags once", () => {
    expect(decodeHtmlEntities("&lt;h2&gt;Hello&lt;/h2&gt;")).toBe("<h2>Hello</h2>");
  });
});

describe("htmlLooksLikeMarkup", () => {
  it("detects h2 and paragraph tags", () => {
    expect(htmlLooksLikeMarkup("<h2>Title</h2>")).toBe(true);
    expect(htmlLooksLikeMarkup("<p>Hello</p>")).toBe(true);
    expect(htmlLooksLikeMarkup("plain text")).toBe(false);
  });
});

describe("htmlLooksEscaped", () => {
  it("detects escaped markup", () => {
    expect(htmlLooksEscaped("&lt;p&gt;x&lt;/p&gt;")).toBe(true);
    expect(htmlLooksEscaped("<p>x</p>")).toBe(false);
  });
});

describe("normalizeStoredRichText", () => {
  it("decodes escaped HTML for rendering", () => {
    const input = "&lt;h2&gt;Hello&lt;/h2&gt;&lt;p&gt;World&lt;/p&gt;";
    const out = normalizeStoredRichText(input);
    expect(htmlLooksLikeMarkup(out)).toBe(true);
    expect(stripHtml(out)).toBe("Hello World");
  });

  it("leaves plain text unchanged", () => {
    expect(normalizeStoredRichText("I am grateful today.")).toBe("I am grateful today.");
  });

  it("strips inline styles from HTML", () => {
    const out = normalizeStoredRichText('<h2 style="font-size: 20px">Title</h2>');
    expect(out).toBe("<h2>Title</h2>");
  });
});

describe("sanitizeRichTextHtml", () => {
  it("removes script tags", () => {
    expect(sanitizeRichTextHtml('<p>ok</p><script>alert(1)</script>')).toBe("<p>ok</p>");
  });

  it("removes style attributes", () => {
    expect(sanitizeRichTextHtml('<h2 style="font-size: 20px">Title</h2>')).toBe(
      "<h2>Title</h2>",
    );
  });
});
