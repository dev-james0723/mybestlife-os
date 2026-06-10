import { describe, expect, it } from "vitest";
import {
  createOSBuddyQuickSnapPayloadFromParts,
  createOSBuddyQuickSnapPayloadFromNavigatorClipboard,
  extractQuickSnapUrls,
  registerQuickSnapShiftTap,
} from "./os-buddy-quick-snap";

function fileLike(name: string, type: string, size = 1024): File {
  return { name, type, size } as File;
}

describe("OS Buddy Quick Snap payload parsing", () => {
  it("extracts and normalizes links from pasted text", () => {
    expect(
      extractQuickSnapUrls("Read https://example.com/article?x=1#section and https://example.com/article?x=1"),
    ).toEqual(["https://example.com/article?x=1"]);
  });

  it("classifies a pure multi-link paste as URL entries", () => {
    const payload = createOSBuddyQuickSnapPayloadFromParts({
      plainText: "https://a.example/post\nhttps://b.example/deep/page",
      now: 100,
    });

    expect(payload?.primaryKind).toBe("url");
    expect(payload?.previewLabel).toBe("2 links");
    expect(payload?.entries).toHaveLength(2);
    expect(payload?.entries[0]).toMatchObject({ kind: "url", url: "https://a.example/post" });
  });

  it("keeps HTML selections as HTML while also surfacing embedded links", () => {
    const payload = createOSBuddyQuickSnapPayloadFromParts({
      html: '<article><h1>AI notes</h1><p>Useful context <a href="https://example.com/ai">link</a></p></article>',
      plainText: "AI notes\nUseful context https://example.com/ai",
      now: 100,
    });

    expect(payload?.primaryKind).toBe("mixed");
    expect(payload?.entries.some((entry) => entry.kind === "html")).toBe(true);
    expect(payload?.entries.some((entry) => entry.kind === "url")).toBe(true);
  });

  it("classifies pasted files and mixed captions", () => {
    const payload = createOSBuddyQuickSnapPayloadFromParts({
      files: [
        fileLike("photo.png", "image/png", 2048),
        fileLike("voice.wav", "audio/wav", 4096),
      ],
      plainText: "Reference for the product idea",
      now: 100,
    });

    expect(payload?.primaryKind).toBe("mixed");
    expect(payload?.previewLabel).toBe("3 items");
    expect(payload?.entries.filter((entry) => entry.kind === "file")).toHaveLength(2);
    expect(payload?.entries.some((entry) => entry.kind === "text")).toBe(true);
  });

  it("builds payloads from navigator clipboard text", async () => {
    const payload = await createOSBuddyQuickSnapPayloadFromNavigatorClipboard(
      {
        readText: async () => "Capture this directly from clipboard",
      } as Clipboard,
      200,
    );

    expect(payload?.primaryKind).toBe("text");
    expect(payload?.previewLabel).toBe("text note");
    expect(payload?.entries[0]).toMatchObject({
      kind: "text",
      text: "Capture this directly from clipboard",
    });
    expect(payload?.pastedAt).toBe(200);
  });

  it("falls back from clipboard read() to readText()", async () => {
    const payload = await createOSBuddyQuickSnapPayloadFromNavigatorClipboard(
      {
        read: async () => {
          throw new Error("read blocked");
        },
        readText: async () => "https://example.com/from-read-text",
      } as unknown as Clipboard,
      300,
    );

    expect(payload?.primaryKind).toBe("url");
    expect(payload?.entries[0]).toMatchObject({
      kind: "url",
      url: "https://example.com/from-read-text",
    });
  });
});

describe("OS Buddy Quick Snap Shift selector", () => {
  it("waits on one Shift and resolves double Shift to Knowledge Base", () => {
    const first = registerQuickSnapShiftTap({
      state: { count: 0, lastAt: null },
      now: 1_000,
    });

    expect(first.immediateDestination).toBeNull();
    expect(first.state.count).toBe(1);

    const second = registerQuickSnapShiftTap({
      state: first.state,
      now: 1_180,
    });

    expect(second.immediateDestination).toBe("knowledge");
    expect(second.state).toEqual({ count: 0, lastAt: null });
  });

  it("ignores repeated keydown events", () => {
    const result = registerQuickSnapShiftTap({
      state: { count: 1, lastAt: 1_000 },
      now: 1_040,
      repeat: true,
    });

    expect(result.immediateDestination).toBeNull();
    expect(result.state).toEqual({ count: 1, lastAt: 1_000 });
  });

  it("starts a new single-Shift window after timeout", () => {
    const result = registerQuickSnapShiftTap({
      state: { count: 1, lastAt: 1_000 },
      now: 1_500,
      doubleTapMs: 320,
    });

    expect(result.immediateDestination).toBeNull();
    expect(result.state).toEqual({ count: 1, lastAt: 1_500 });
  });
});
