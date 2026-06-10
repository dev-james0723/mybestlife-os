import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOSBuddyQuickSnapPayloadFromParts } from "./os-buddy-quick-snap";
import { routeOSBuddyQuickSnapPayload } from "./os-buddy-quick-snap-routing";
import { addKnowledgeFromText, addKnowledgeFromUrl } from "@/lib/knowledge/mutations";
import {
  finalizeUploadedKnowledgeFile,
  uploadKnowledgeFileToStorage,
} from "@/lib/knowledge/client-file-upload";
import { fetchIdeaAutoEnrich } from "@/lib/ideas/fetchIdeaAutoEnrich";
import { fetchIdeaCardVisual } from "@/lib/ideas/fetchIdeaCardVisual";
import { ideasRepository } from "@/lib/repositories/ideas";

vi.mock("@/lib/knowledge/mutations", () => ({
  addKnowledgeFromText: vi.fn(),
  addKnowledgeFromUrl: vi.fn(),
}));

vi.mock("@/lib/knowledge/client-file-upload", () => ({
  uploadKnowledgeFileToStorage: vi.fn(),
  finalizeUploadedKnowledgeFile: vi.fn(),
}));

vi.mock("@/lib/ideas/fetchIdeaAutoEnrich", () => ({
  fetchIdeaAutoEnrich: vi.fn(),
}));

vi.mock("@/lib/ideas/fetchIdeaCardVisual", () => ({
  fetchIdeaCardVisual: vi.fn(),
}));

vi.mock("@/lib/repositories/ideas", () => ({
  ideasRepository: {
    create: vi.fn(),
  },
}));

function fileLike(name: string, type: string, size = 2048): File {
  return { name, type, size } as File;
}

describe("routeOSBuddyQuickSnapPayload", () => {
  beforeEach(() => {
    vi.mocked(addKnowledgeFromText).mockReset();
    vi.mocked(addKnowledgeFromUrl).mockReset();
    vi.mocked(uploadKnowledgeFileToStorage).mockReset();
    vi.mocked(finalizeUploadedKnowledgeFile).mockReset();
    vi.mocked(fetchIdeaAutoEnrich).mockReset();
    vi.mocked(fetchIdeaCardVisual).mockReset();
    vi.mocked(ideasRepository.create).mockReset();

    vi.mocked(addKnowledgeFromText).mockResolvedValue({
      id: "kb-text",
      title: "Text",
    } as Awaited<ReturnType<typeof addKnowledgeFromText>>);
    vi.mocked(addKnowledgeFromUrl).mockResolvedValue({
      id: "kb-url",
      title: "URL",
    } as Awaited<ReturnType<typeof addKnowledgeFromUrl>>);
    vi.mocked(uploadKnowledgeFileToStorage).mockResolvedValue({
      storagePath: "user/file.png",
      contentType: "image/png",
      thumbnailStoragePath: null,
    });
    vi.mocked(finalizeUploadedKnowledgeFile).mockResolvedValue({
      id: "kb-file",
      title: "File",
    } as Awaited<ReturnType<typeof finalizeUploadedKnowledgeFile>>);
    vi.mocked(ideasRepository.create).mockResolvedValue({
      id: "idea-1",
      title: "Quick Snap",
    } as Awaited<ReturnType<typeof ideasRepository.create>>);
    vi.mocked(fetchIdeaAutoEnrich).mockResolvedValue({
      id: "idea-1",
      title: "Enriched",
    } as Awaited<ReturnType<typeof fetchIdeaAutoEnrich>>);
  });

  it("creates one Idea Capture card with uploaded file attachments", async () => {
    const payload = createOSBuddyQuickSnapPayloadFromParts({
      files: [fileLike("sketch.png", "image/png")],
      plainText: "Possible product direction",
      now: 100,
    });
    expect(payload).not.toBeNull();

    const result = await routeOSBuddyQuickSnapPayload({
      payload: payload!,
      destination: "idea",
      language: "en",
    });

    expect(uploadKnowledgeFileToStorage).toHaveBeenCalledWith(
      expect.objectContaining({ name: "sketch.png" }),
      { createPhotoThumbnail: false },
    );
    expect(ideasRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source_type: "share",
        capture_kind: "idea",
        attachments: [
          expect.objectContaining({
            type: "os_buddy_file",
            storage_path: "user/file.png",
            name: "sketch.png",
            kind: "image",
          }),
        ],
      }),
    );
    expect(fetchIdeaAutoEnrich).toHaveBeenCalledWith({
      ideaId: "idea-1",
      includeVisual: true,
    });
    expect(result.savedCount).toBe(1);
    expect(result.ackContext.destination).toBe("idea");
  });

  it("routes URL and text entries to Knowledge Base mutations", async () => {
    const payload = createOSBuddyQuickSnapPayloadFromParts({
      plainText: "Read this later\nhttps://example.com/ai",
      now: 100,
    });
    expect(payload).not.toBeNull();

    const result = await routeOSBuddyQuickSnapPayload({
      payload: payload!,
      destination: "knowledge",
      language: "zh-TW",
    });

    expect(addKnowledgeFromText).toHaveBeenCalledTimes(1);
    expect(addKnowledgeFromUrl).toHaveBeenCalledTimes(1);
    expect(addKnowledgeFromUrl).toHaveBeenCalledWith("https://example.com/ai", {
      thumbnailStyle: "na",
      language: "zh-TW",
    });
    expect(result.savedCount).toBe(2);
    expect(result.knowledgeItems).toHaveLength(2);
  });

  it("routes files to Knowledge Base upload and finalize pipeline", async () => {
    const file = fileLike("brief.pdf", "application/pdf");
    const payload = createOSBuddyQuickSnapPayloadFromParts({
      files: [file],
      now: 100,
    });
    expect(payload).not.toBeNull();

    await routeOSBuddyQuickSnapPayload({
      payload: payload!,
      destination: "knowledge",
      language: "en",
    });

    expect(uploadKnowledgeFileToStorage).toHaveBeenCalledWith(file, {
      createPhotoThumbnail: true,
    });
    expect(finalizeUploadedKnowledgeFile).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ storagePath: "user/file.png" }),
      { thumbnailStyle: "na", language: "en" },
    );
  });
});
