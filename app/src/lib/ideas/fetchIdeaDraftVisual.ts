export type IdeaDraftVisualResult = {
  imageUrl: string;
  prompt?: string;
  model?: string;
  warning?: string;
};

export async function fetchIdeaDraftVisual(params: {
  contentHtml: string;
  title?: string;
  summary?: string;
  tags?: string[];
  signal?: AbortSignal;
}): Promise<IdeaDraftVisualResult> {
  const res = await fetch("/api/ideas/draft-visual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      contentHtml: params.contentHtml,
      title: params.title ?? "",
      summary: params.summary ?? "",
      tags: params.tags ?? [],
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  }

  const data = (await res.json()) as Record<string, unknown>;
  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : "";
  if (!imageUrl) throw new Error("draft_visual_missing_image");
  return {
    imageUrl,
    prompt: typeof data.prompt === "string" ? data.prompt : undefined,
    model: typeof data.model === "string" ? data.model : undefined,
    warning: typeof data.warning === "string" ? data.warning : undefined,
  };
}
