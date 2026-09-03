import { describe, expect, it } from "vitest";
import {
  normalizeRelationshipSocialLinks,
  normalizeRelationshipSocialUrl,
} from "./relationship";

describe("relationship social links", () => {
  it("keeps supported web links and drops malformed JSONB entries", () => {
    expect(
      normalizeRelationshipSocialLinks([
        { platform: "linkedin", url: "https://linkedin.com/in/ada" },
        { platform: "unknown", url: "https://example.com" },
        { platform: "x", url: "javascript:alert(1)" },
        null,
      ]),
    ).toEqual([
      {
        platform: "linkedin",
        url: "https://linkedin.com/in/ada",
      },
    ]);
  });

  it("allows http(s) only", () => {
    expect(normalizeRelationshipSocialUrl("https://example.com/profile")).toBe(
      "https://example.com/profile",
    );
    expect(normalizeRelationshipSocialUrl("data:text/html,test")).toBeNull();
    expect(normalizeRelationshipSocialUrl("not a url")).toBeNull();
  });
});
