import { describe, expect, it } from "vitest";
import {
  advanceKnowledgeFileQueue,
  createKnowledgeFileQueue,
  getCurrentKnowledgeFile,
  getKnowledgeFileQueuePosition,
  skipCurrentKnowledgeFile,
} from "./knowledge-file-queue";

describe("knowledge file queue", () => {
  it("initializes queue position from selected files", () => {
    const queue = createKnowledgeFileQueue(["a.pdf", "b.png", "c.mp3"]);

    expect(getCurrentKnowledgeFile(queue)).toBe("a.pdf");
    expect(getKnowledgeFileQueuePosition(queue)).toEqual({ current: 1, total: 3 });
  });

  it("advances after the current file is imported", () => {
    const queue = createKnowledgeFileQueue(["a.pdf", "b.png"]);
    const next = advanceKnowledgeFileQueue(queue);

    expect(getCurrentKnowledgeFile(next)).toBe("b.png");
    expect(getKnowledgeFileQueuePosition(next)).toEqual({ current: 2, total: 2 });
  });

  it("skips the current file with the same queue semantics as advance", () => {
    const queue = createKnowledgeFileQueue(["a.pdf", "b.png"]);
    const next = skipCurrentKnowledgeFile(queue);

    expect(next).toEqual(advanceKnowledgeFileQueue(queue));
    expect(getCurrentKnowledgeFile(next)).toBe("b.png");
  });

  it("keeps an empty queue stable", () => {
    const queue = createKnowledgeFileQueue<string>([]);
    const next = advanceKnowledgeFileQueue(queue);

    expect(next).toBe(queue);
    expect(getCurrentKnowledgeFile(next)).toBeNull();
    expect(getKnowledgeFileQueuePosition(next)).toBeNull();
  });
});
