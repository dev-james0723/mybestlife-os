import { describe, expect, it } from "vitest";
import {
  buildOSBuddyIdeaAttachment,
  buildOSBuddyIdeaContent,
  classifyOSBuddyDroppedFile,
  createOSBuddyDroppedFileItem,
  defaultOSBuddyDropDestinationForKind,
  formatOSBuddyFileSize,
  groupOSBuddyDroppedFilesByKind,
} from "./os-buddy-file-drop";

function fileLike(name: string, type: string, size = 1024): File {
  return { name, type, size } as File;
}

describe("OSBuddy file drop helpers", () => {
  it("classifies common document and media file types", () => {
    expect(classifyOSBuddyDroppedFile({ name: "brief.pdf", mime: "application/pdf" })).toBe(
      "document",
    );
    expect(
      classifyOSBuddyDroppedFile({
        name: "forecast.xlsx",
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ).toBe("spreadsheet");
    expect(classifyOSBuddyDroppedFile({ name: "photo.PNG", mime: "" })).toBe("image");
    expect(classifyOSBuddyDroppedFile({ name: "voice.m4a", mime: "audio/mp4" })).toBe("audio");
    expect(classifyOSBuddyDroppedFile({ name: "clip.mov", mime: "video/quicktime" })).toBe(
      "video",
    );
    expect(classifyOSBuddyDroppedFile({ name: "archive.bin", mime: "" })).toBe("unknown");
  });

  it("uses smart default destinations", () => {
    expect(defaultOSBuddyDropDestinationForKind("image")).toBe("idea");
    expect(defaultOSBuddyDropDestinationForKind("document")).toBe("knowledge");
    expect(defaultOSBuddyDropDestinationForKind("spreadsheet")).toBe("knowledge");
    expect(defaultOSBuddyDropDestinationForKind("audio")).toBe("knowledge");
    expect(defaultOSBuddyDropDestinationForKind("video")).toBe("knowledge");
    expect(defaultOSBuddyDropDestinationForKind("unknown")).toBe("knowledge");
  });

  it("creates dropped file items with stable defaults", () => {
    const item = createOSBuddyDroppedFileItem(fileLike("sketch.jpg", "image/jpeg", 2048), () => "f1");
    expect(item).toMatchObject({
      id: "f1",
      name: "sketch.jpg",
      mime: "image/jpeg",
      kind: "image",
      destination: "idea",
      status: "queued",
    });
  });

  it("groups files by kind", () => {
    const items = [
      createOSBuddyDroppedFileItem(fileLike("a.pdf", "application/pdf"), () => "a"),
      createOSBuddyDroppedFileItem(fileLike("b.docx", ""), () => "b"),
      createOSBuddyDroppedFileItem(fileLike("c.png", "image/png"), () => "c"),
    ];

    const groups = groupOSBuddyDroppedFilesByKind(items);
    expect(groups).toEqual([
      { kind: "document", files: [items[0], items[1]] },
      { kind: "image", files: [items[2]] },
    ]);
  });

  it("builds attachment JSON for Idea Capture", () => {
    expect(
      buildOSBuddyIdeaAttachment({
        storagePath: "user/file.pdf",
        name: "file.pdf",
        mimeType: "application/pdf",
        size: 1234,
        kind: "document",
      }),
    ).toEqual({
      type: "os_buddy_file",
      bucket: "knowledge-files",
      storage_path: "user/file.pdf",
      name: "file.pdf",
      mime_type: "application/pdf",
      size: 1234,
      kind: "document",
    });
  });

  it("formats content and file sizes", () => {
    expect(
      buildOSBuddyIdeaContent({
        name: "memo.pdf",
        kind: "document",
        knowledgeItemId: "kb-1",
      }),
    ).toContain("Linked Knowledge Base item: kb-1");
    expect(formatOSBuddyFileSize(0)).toBe("0 B");
    expect(formatOSBuddyFileSize(1536)).toBe("1.5 KB");
    expect(formatOSBuddyFileSize(5 * 1024 * 1024)).toBe("5 MB");
  });
});
