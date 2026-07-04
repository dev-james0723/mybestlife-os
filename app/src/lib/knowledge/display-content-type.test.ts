import { describe, expect, it } from "vitest";
import type { KnowledgeItem } from "@/types/knowledge";
import { getKnowledgeDisplayContentType } from "./display-content-type";

function item(overrides: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id: "item-1",
    userId: "user-1",
    title: "Upload",
    isFavorite: false,
    contentType: "file",
    aiTags: [],
    manualTags: [],
    aiKeyInsights: [],
    aiKeyQuotes: [],
    aiQuestionsAnswered: [],
    aiActionItems: [],
    aiVideoChatStarters: [],
    status: "ready",
    dateAdded: "2026-07-05T00:00:00.000Z",
    dateModified: "2026-07-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("getKnowledgeDisplayContentType", () => {
  it("treats legacy uploaded PDFs as documents for UI grouping", () => {
    expect(
      getKnowledgeDisplayContentType(
        item({
          title: "proposal.pdf",
          filePath: "user/uploads/proposal.pdf",
        }),
      ),
    ).toBe("document");
  });

  it("keeps generic uploaded files as files", () => {
    expect(
      getKnowledgeDisplayContentType(
        item({
          title: "archive.zip",
          sourceType: "file_upload",
          filePath: "user/uploads/archive.zip",
        }),
      ),
    ).toBe("file");
  });
});
