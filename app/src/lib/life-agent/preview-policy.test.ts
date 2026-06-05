import { describe, expect, it } from "vitest";
import {
  isPreviewExpired,
  LIFE_AGENT_PREVIEW_TTL_MS,
} from "@/lib/life-agent/preview-policy";

describe("preview-policy", () => {
  it("expires previews older than TTL", () => {
    const old = new Date(Date.now() - LIFE_AGENT_PREVIEW_TTL_MS - 1000).toISOString();
    expect(isPreviewExpired(old)).toBe(true);
  });

  it("allows fresh previews", () => {
    const recent = new Date().toISOString();
    expect(isPreviewExpired(recent)).toBe(false);
  });
});
