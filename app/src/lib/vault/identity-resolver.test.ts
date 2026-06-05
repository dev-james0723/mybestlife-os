import { describe, expect, it } from "vitest";
import {
  detectInputType,
  isLikelyProductCandidate,
} from "@/lib/vault/identity-resolver";

describe("detectInputType", () => {
  it("detects GitHub repo URLs", () => {
    expect(detectInputType("https://github.com/vercel/next.js")).toBe("github");
    expect(detectInputType("github.com/facebook/react")).toBe("github");
  });

  it("detects generic URLs", () => {
    expect(detectInputType("https://cursor.com")).toBe("url");
    expect(detectInputType("notion.so")).toBe("url");
  });

  it("detects long descriptions", () => {
    expect(
      detectInputType(
        "A desktop IDE for AI assisted coding with strong autocomplete and repo context",
      ),
    ).toBe("description");
  });

  it("defaults short queries to name", () => {
    expect(detectInputType("Cursor")).toBe("name");
    expect(detectInputType("")).toBe("name");
  });
});

describe("isLikelyProductCandidate", () => {
  it("keeps obvious product matches", () => {
    expect(isLikelyProductCandidate("Manus", "Manus", "https://manus.im")).toBe(true);
    expect(
      isLikelyProductCandidate("Reve Image", "Reve Image", "https://app.reve.com"),
    ).toBe(true);
  });

  it("rejects unrelated short-name search hits", () => {
    expect(
      isLikelyProductCandidate("Manus", "Screen Studio", "https://screen.studio"),
    ).toBe(false);
  });
});
