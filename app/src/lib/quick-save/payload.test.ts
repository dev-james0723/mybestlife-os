import { describe, expect, it } from "vitest";
import { extractFirstHttpUrl } from "./payload";

describe("extractFirstHttpUrl", () => {
  it("uses a direct url field first", () => {
    expect(extractFirstHttpUrl("https://example.com/a", "text")).toBe("https://example.com/a");
  });

  it("finds Android-style urls embedded in text", () => {
    expect(extractFirstHttpUrl("", "Read this: https://example.com/post?id=1.")).toBe(
      "https://example.com/post?id=1",
    );
  });

  it("ignores non-http urls", () => {
    expect(extractFirstHttpUrl("mailto:test@example.com", "plain text")).toBeNull();
  });
});
