import { describe, expect, it } from "vitest";
import {
  isCalmArrivalState,
  resolveAvatarState,
  resolveDisplayCharacter,
} from "@/lib/life-agent/character-state";
import { getDefaultLifeAgentCharacter } from "@/lib/life-agent/character-presets";

describe("character-state", () => {
  it("marks vulnerable arrivals as calm", () => {
    expect(isCalmArrivalState("anxious")).toBe(true);
    expect(isCalmArrivalState("focused")).toBe(false);
  });

  it("resolves celebrating over other signals", () => {
    expect(
      resolveAvatarState({
        mode: "operator",
        isSending: true,
        isChatPending: true,
        celebrating: true,
        arrival: "focused",
      }),
    ).toBe("celebrating");
  });

  it("uses concerned state for heavy arrival", () => {
    expect(
      resolveAvatarState({
        mode: "companion",
        isSending: false,
        isChatPending: false,
        celebrating: false,
        arrival: "heavy",
      }),
    ).toBe("concerned");
  });

  it("merges profile custom name into display character", () => {
    const preset = getDefaultLifeAgentCharacter();
    const merged = resolveDisplayCharacter(preset, {
      custom_name: "Aura",
      warmth: 90,
    } as Parameters<typeof resolveDisplayCharacter>[1]);
    expect(merged.displayName).toBe("Aura");
    expect(merged.warmth).toBe(90);
  });
});
