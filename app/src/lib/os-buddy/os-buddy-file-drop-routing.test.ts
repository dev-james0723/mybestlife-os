import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOSBuddyDroppedFileItem, type OSBuddyDroppedFileItem } from "./os-buddy-file-drop";
import { routeOSBuddyDroppedFile } from "./os-buddy-file-drop-routing";
import { finalizeUploadedKnowledgeFile, uploadKnowledgeFileToStorage } from "@/lib/knowledge/client-file-upload";
import { ideasRepository } from "@/lib/repositories/ideas";

vi.mock("@/lib/knowledge/client-file-upload", () => ({
  uploadKnowledgeFileToStorage: vi.fn(),
  finalizeUploadedKnowledgeFile: vi.fn(),
}));

vi.mock("@/lib/repositories/ideas", () => ({
  ideasRepository: {
    create: vi.fn(),
  },
}));

function fileLike(name: string, type: string, size = 2048): File {
  return { name, type, size } as File;
}

function itemFor(
  file: File,
  destination: OSBuddyDroppedFileItem["destination"],
): OSBuddyDroppedFileItem {
  return {
    ...createOSBuddyDroppedFileItem(file, () => "drop-1"),
    destination,
  };
}

describe("routeOSBuddyDroppedFile", () => {
  beforeEach(() => {
    vi.mocked(uploadKnowledgeFileToStorage).mockReset();
    vi.mocked(finalizeUploadedKnowledgeFile).mockReset();
    vi.mocked(ideasRepository.create).mockReset();
    vi.mocked(uploadKnowledgeFileToStorage).mockResolvedValue({
      storagePath: "user/file.pdf",
      contentType: "application/pdf",
      thumbnailStoragePath: null,
    });
    vi.mocked(finalizeUploadedKnowledgeFile).mockResolvedValue({
      id: "kb-1",
      title: "File",
    } as Awaited<ReturnType<typeof finalizeUploadedKnowledgeFile>>);
    vi.mocked(ideasRepository.create).mockResolvedValue({
      id: "idea-1",
      title: "file.pdf",
    } as Awaited<ReturnType<typeof ideasRepository.create>>);
  });

  it("routes Knowledge Base-only files without creating an idea", async () => {
    const file = fileLike("file.pdf", "application/pdf");
    const result = await routeOSBuddyDroppedFile({
      item: itemFor(file, "knowledge"),
      language: "zh-TW",
    });

    expect(uploadKnowledgeFileToStorage).toHaveBeenCalledTimes(1);
    expect(uploadKnowledgeFileToStorage).toHaveBeenCalledWith(file, {
      createPhotoThumbnail: true,
    });
    expect(finalizeUploadedKnowledgeFile).toHaveBeenCalledTimes(1);
    expect(ideasRepository.create).not.toHaveBeenCalled();
    expect(result.knowledgeItem?.id).toBe("kb-1");
    expect(result.idea).toBeNull();
  });

  it("routes Idea-only files as attachments without finalizing a KB item", async () => {
    const file = fileLike("image.png", "image/png");
    await routeOSBuddyDroppedFile({
      item: itemFor(file, "idea"),
      language: "en",
    });

    expect(uploadKnowledgeFileToStorage).toHaveBeenCalledWith(file, {
      createPhotoThumbnail: false,
    });
    expect(finalizeUploadedKnowledgeFile).not.toHaveBeenCalled();
    expect(ideasRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "image.png",
        linked_knowledge_item_ids: [],
        attachments: [
          expect.objectContaining({
            type: "os_buddy_file",
            bucket: "knowledge-files",
            storage_path: "user/file.pdf",
            name: "image.png",
            kind: "image",
          }),
        ],
      }),
    );
  });

  it("routes Both with one upload and links the created idea to the KB item", async () => {
    const file = fileLike("file.pdf", "application/pdf");
    const result = await routeOSBuddyDroppedFile({
      item: itemFor(file, "both"),
      language: "en",
    });

    expect(uploadKnowledgeFileToStorage).toHaveBeenCalledTimes(1);
    expect(finalizeUploadedKnowledgeFile).toHaveBeenCalledTimes(1);
    expect(ideasRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        linked_knowledge_item_ids: ["kb-1"],
        destinations: ["kb"],
        content: expect.stringContaining("Linked Knowledge Base item: kb-1"),
      }),
    );
    expect(result.knowledgeItem?.id).toBe("kb-1");
    expect(result.idea?.id).toBe("idea-1");
  });
});
