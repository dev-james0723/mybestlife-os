/**
 * GitHub repository ingestion adapter.
 *
 * 1. Parse owner/repo from URL.
 * 2. Fetch public repository metadata (stars, description, language, default
 *    branch) via the REST API (optional GITHUB_TOKEN lifts rate limits).
 * 3. Fetch raw README markdown + rendered HTML for preview (reuses the
 *    existing `github-readme.ts` helper).
 * 4. On failure, fall back to a metadata-only card so the user still has
 *    something useful.
 */

import {
  fetchGitHubDefaultReadme,
  parseGitHubRepoUrl,
  type GitHubRepoRef,
} from "@/lib/knowledge/github-readme";
import { encodeCodeContent } from "@/lib/knowledge/code-content";
import type { NormalizedIngest } from "./types";
import { degradedResult } from "./types";

type RepoMetadata = {
  fullName?: string;
  description?: string;
  language?: string;
  stars?: number;
  forks?: number;
  defaultBranch?: string;
  publishedAt?: string;
  ownerAvatar?: string;
};

export async function ingestGitHubRepo(url: string): Promise<NormalizedIngest> {
  const ref = parseGitHubRepoUrl(url);
  if (!ref) {
    return degradedResult({
      sourceType: "github_repository",
      provider: "github",
      category: "repository",
      label: "GitHub Repository",
      title: "GitHub Repository",
      sourceUrl: url,
      domain: "github.com",
      extractionStatus: "failed",
      askEnabled: true,
      contentType: "repository",
    });
  }

  const canonical = `https://github.com/${ref.owner}/${ref.repo}`;

  const [repoMeta, readme] = await Promise.all([
    fetchRepoMetadata(ref).catch(() => null),
    fetchGitHubDefaultReadme(ref).catch(() => null),
  ]);

  const hasReadme = Boolean(readme?.markdown);
  const title = repoMeta?.fullName || `${ref.owner}/${ref.repo}`;

  const extractionStatus = hasReadme
    ? "success"
    : repoMeta
      ? "partial"
      : "failed";

  // Prefer storing the markdown directly so the rendering layer can choose
  // between react-markdown preview and raw-source view. If markdown is
  // unavailable but GitHub returned rendered HTML, fall back to that.
  const rawContent = hasReadme
    ? encodeCodeContent({
        source: readme!.markdown,
        language: "markdown",
        preferredView: "preview",
      })
    : readme?.rawContentForDb ?? undefined;

  const aiInput = [
    repoMeta?.description,
    readme?.markdown,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    sourceType: "github_repository",
    provider: "github",
    category: "repository",
    label: "GitHub Repository",
    title,
    titleSource: "extracted",
    sourceUrl: url,
    sourceDomain: "github.com",
    thumbnailUrl: repoMeta?.ownerAvatar,
    rawContent,
    aiInputText: aiInput || title,
    metadata: {
      domain: "github.com",
      canonicalUrl: canonical,
      owner: ref.owner,
      repo: ref.repo,
      handle: `${ref.owner}/${ref.repo}`,
      stars: repoMeta?.stars,
      forks: repoMeta?.forks,
      language: repoMeta?.language,
      publishedAt: repoMeta?.publishedAt,
    },
    extractionStatus,
    transcriptStatus: "not_applicable",
    askEnabled: true,
    contentType: "repository",
    displayModeDefault: "preview",
  };
}

async function fetchRepoMetadata(ref: GitHubRepoRef): Promise<RepoMetadata | null> {
  const headers: Record<string, string> = {
    "User-Agent": "MyLifeOS-Knowledge/1.0",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`,
    { headers, signal: AbortSignal.timeout(10000) },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;

  const owner = json.owner as Record<string, unknown> | undefined;
  return {
    fullName: typeof json.full_name === "string" ? json.full_name : undefined,
    description:
      typeof json.description === "string" && json.description.trim().length > 0
        ? json.description.trim()
        : undefined,
    language: typeof json.language === "string" ? json.language : undefined,
    stars: typeof json.stargazers_count === "number" ? json.stargazers_count : undefined,
    forks: typeof json.forks_count === "number" ? json.forks_count : undefined,
    defaultBranch:
      typeof json.default_branch === "string" ? json.default_branch : undefined,
    publishedAt:
      typeof json.pushed_at === "string" ? json.pushed_at : undefined,
    ownerAvatar:
      owner && typeof owner.avatar_url === "string" ? owner.avatar_url : undefined,
  };
}
