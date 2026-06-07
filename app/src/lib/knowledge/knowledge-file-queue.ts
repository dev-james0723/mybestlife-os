export type KnowledgeFileQueueState<TFile = File> = {
  files: TFile[];
  completedCount: number;
  totalCount: number;
};

export type KnowledgeFileQueuePosition = {
  current: number;
  total: number;
};

export function createKnowledgeFileQueue<TFile>(
  files: readonly TFile[],
): KnowledgeFileQueueState<TFile> {
  return {
    files: [...files],
    completedCount: 0,
    totalCount: files.length,
  };
}

export function getCurrentKnowledgeFile<TFile>(
  queue: KnowledgeFileQueueState<TFile>,
): TFile | null {
  return queue.files[0] ?? null;
}

export function getKnowledgeFileQueuePosition<TFile>(
  queue: KnowledgeFileQueueState<TFile>,
): KnowledgeFileQueuePosition | null {
  if (queue.files.length === 0) return null;
  return {
    current: queue.completedCount + 1,
    total: queue.totalCount,
  };
}

export function advanceKnowledgeFileQueue<TFile>(
  queue: KnowledgeFileQueueState<TFile>,
): KnowledgeFileQueueState<TFile> {
  if (queue.files.length === 0) return queue;
  return {
    files: queue.files.slice(1),
    completedCount: queue.completedCount + 1,
    totalCount: queue.totalCount,
  };
}

export const skipCurrentKnowledgeFile = advanceKnowledgeFileQueue;
