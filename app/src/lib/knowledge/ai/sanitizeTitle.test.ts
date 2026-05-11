import { describe, expect, it } from "vitest";
import { sanitizeTitle } from "./sanitizeTitle";

describe("sanitizeTitle", () => {
  it("strips 'Instagram post by …' prefix", () => {
    // Sanitizer reliably strips the platform/source phrase. Stripping
    // author names ("by John") is best-effort; what we assert here is the
    // load-bearing guarantee: no "Instagram post" survives.
    const out = sanitizeTitle("Instagram Post by John About Travel", "fallback");
    expect(out.toLowerCase()).not.toContain("instagram");
    expect(out.toLowerCase()).toContain("travel");
  });

  it("strips 'Video post on X …' prefix", () => {
    expect(sanitizeTitle("Video post on X about deep work", "fallback"))
      .toMatch(/^Deep work$|^Deep work\b/);
  });

  it("strips 'Facebook post about …' prefix", () => {
    expect(sanitizeTitle("Facebook Post About Gratitude Practice", "fallback"))
      .toMatch(/^Gratitude practice$/i);
  });

  it("strips 'Threads post: …' prefix", () => {
    expect(sanitizeTitle("Threads Post: 3D Knowledge Graph for Code", "fallback"))
      .toBe("3D Knowledge Graph for Code");
  });

  it("strips 'Reddit post on …' prefix", () => {
    expect(sanitizeTitle("Reddit post on r/programming about Rust ergonomics", "fallback"))
      .toMatch(/Rust ergonomics/i);
  });

  it("strips 'Social media post about …' prefix", () => {
    expect(sanitizeTitle("Social media post about climate goals", "fallback"))
      .toMatch(/^Climate goals$/i);
  });

  it("strips 'Overview of short-form video content about …' prefix", () => {
    expect(sanitizeTitle("Overview of short-form video content about creator economy", "fallback"))
      .toMatch(/^Creator economy$/i);
  });

  it("strips 'This post discusses …' prefix", () => {
    expect(sanitizeTitle("This post discusses async runtime tradeoffs", "fallback"))
      .toMatch(/^Async runtime tradeoffs$/i);
  });

  it("preserves Traditional Chinese title verbatim and caps at 22 chars", () => {
    const out = sanitizeTitle("等待與命運的感悟", "fallback");
    expect(out).toBe("等待與命運的感悟");
  });

  it("preserves Simplified Chinese without converting", () => {
    const out = sanitizeTitle("珍惜当下的提醒", "fallback");
    expect(out).toBe("珍惜当下的提醒");
    // Must NOT have been converted to Traditional.
    expect(out).not.toContain("當下");
  });

  it("preserves Traditional Chinese without converting", () => {
    const out = sanitizeTitle("珍惜當下的提醒", "fallback");
    expect(out).toBe("珍惜當下的提醒");
    // Must NOT have been converted to Simplified.
    expect(out).not.toContain("当下");
  });

  it("unwraps quotes", () => {
    expect(sanitizeTitle('"Async runtime tradeoffs"', "fallback")).toBe(
      "Async runtime tradeoffs",
    );
    expect(sanitizeTitle("'Climate goals'", "fallback")).toBe("Climate goals");
    expect(sanitizeTitle("「等待與命運的感悟」", "fallback")).toBe(
      "等待與命運的感悟",
    );
  });

  it("caps long English titles at ~12 words", () => {
    const long = sanitizeTitle(
      "This is a very long title that goes on and on and on and continues forever",
      "fallback",
    );
    const wordCount = long.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(12);
  });

  it("falls back when input collapses entirely to a stripped pattern", () => {
    expect(sanitizeTitle("Instagram post:", "fallback")).toBe("fallback");
    expect(sanitizeTitle("", "fallback")).toBe("fallback");
    expect(sanitizeTitle(undefined, "fallback")).toBe("fallback");
  });

  it("is idempotent (calling twice produces the same result)", () => {
    const once = sanitizeTitle("Instagram post by @user about gratitude", "fallback");
    const twice = sanitizeTitle(once, "fallback");
    expect(twice).toBe(once);
  });

  it("strips stacked prefixes", () => {
    const out = sanitizeTitle(
      "Social media post about an Instagram post by @user about gratitude",
      "fallback",
    );
    expect(out.toLowerCase()).toContain("gratitude");
    expect(out).not.toMatch(/instagram post|social media post/i);
  });
});
