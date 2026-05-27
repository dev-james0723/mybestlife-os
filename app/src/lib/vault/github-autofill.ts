import { fetchGitHubDefaultReadme, parseGitHubRepoUrl } from "@/lib/knowledge/github-readme";

const README_HINT_MAX_CHARS = 12_000;
const FETCH_TIMEOUT_MS = 8000;

type GitHubRepoApiResponse = {
  name?: string;
  full_name?: string;
  description?: string | null;
  homepage?: string | null;
  html_url?: string;
  default_branch?: string;
  topics?: string[];
  stargazers_count?: number;
  license?: { spdx_id?: string | null; name?: string | null } | null;
};

export type GitHubVaultRepoMeta = {
  owner: string;
  name: string;
  fullName: string;
  canonicalUrl: string;
  homepage: string | null;
  description: string | null;
  defaultBranch: string;
  topics: string[];
  stars: number | null;
  license: string | null;
};

export type GitHubVaultContext = {
  canonicalUrl: string;
  repoMeta: GitHubVaultRepoMeta;
  readmeMarkdown: string;
  iconUrl: string | null;
  hintLines: string[];
};

type ImageCandidate = {
  alt: string;
  src: string;
  index: number;
};

type ScoredImageCandidate = ImageCandidate & {
  resolvedUrl: string;
  score: number;
};

export const GITHUB_VAULT_SYSTEM_PROMPT = `You are an expert software catalog assistant for GitHub-hosted open-source software.
The user supplied a GitHub repository URL. Treat the README as the primary source of truth.

Return ONLY valid JSON (no markdown fences) matching this shape exactly, with every field optional:
{
  "app_name": "string",
  "website_url": "https://...",
  "category": "Dev Tools | Finance | Productivity | Design | Communication | AI | ...",
  "platforms": "macOS, Windows, Linux, Web, CLI, ...",
  "use_cases": "3-6 concise use cases separated by commas",
  "status": "Testing | Active | Retired | Wishlist",
  "priority": "Must-have | Nice-to-have | Optional",
  "cost_type": "Free | Freemium | Paid | Subscription",
  "cost_amount": <number or null>,
  "cost_period": "month | year | one-time",
  "summary": "<= 1 sentence, under 180 characters",
  "best_feature": "The clearest product strengths/features, <= 220 characters",
  "biggest_downside": "Practical downside or setup caveat visible from the README, <= 180 characters",
  "best_alternative": "One or two realistic alternatives",
  "replaces": "Tools or workflow this can replace",
  "tags": "comma-separated short tags",
  "default_tool_for": "What job this is the go-to tool for",
  "why_i_use_it": "A concise first-person reason this tool is useful"
}

Guidelines:
- Prefer concrete README claims over generic GitHub metadata.
- If the README says it is an IDE, desktop app, finance tool, or installed software, catalog it as that product, not as GitHub.
- Infer platforms from install instructions, release artifacts, or explicit README statements.
- Use "Free" for open-source projects unless paid/cloud pricing is clearly described.
- If a downside is not explicit, use a modest operational caveat from the README such as setup requirements, required CLI auth, or immature feature scope.
- Omit fields that remain unclear. Never invent pricing or a website URL.`;

function githubApiHeaders(extra: Record<string, string> = {}): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent": "MyLifeOSVaultBot/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }
  return headers;
}

function normalizeHomepage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

async function fetchGitHubRepoMeta(owner: string, repo: string): Promise<GitHubVaultRepoMeta | null> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const res = await fetch(url, {
    headers: githubApiHeaders({ Accept: "application/vnd.github+json" }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }).catch(() => null);
  if (!res?.ok) return null;

  const data = (await res.json().catch(() => null)) as GitHubRepoApiResponse | null;
  if (!data) return null;

  const name = data.name || repo;
  const fullName = data.full_name || `${owner}/${name}`;
  const canonicalUrl = data.html_url || `https://github.com/${owner}/${name}`;
  const license = data.license?.spdx_id || data.license?.name || null;

  return {
    owner,
    name,
    fullName,
    canonicalUrl,
    homepage: normalizeHomepage(data.homepage),
    description: typeof data.description === "string" ? data.description : null,
    defaultBranch: data.default_branch || "main",
    topics: Array.isArray(data.topics) ? data.topics.filter((t): t is string => typeof t === "string") : [],
    stars: typeof data.stargazers_count === "number" ? data.stargazers_count : null,
    license,
  };
}

function stripMarkdownImageUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1).trim();
  }
  const firstWhitespace = trimmed.search(/\s+["']/);
  return (firstWhitespace >= 0 ? trimmed.slice(0, firstWhitespace) : trimmed).trim();
}

export function extractReadmeImageCandidates(markdown: string): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];

  for (const match of markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
    const src = stripMarkdownImageUrl(match[2] ?? "");
    if (src) {
      candidates.push({
        alt: (match[1] ?? "").trim(),
        src,
        index: match.index ?? 0,
      });
    }
  }

  for (const match of markdown.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const tag = match[0] ?? "";
    const alt = /alt=["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    const src = (match[1] ?? "").trim();
    if (src) {
      candidates.push({
        alt: alt.trim(),
        src,
        index: match.index ?? 0,
      });
    }
  }

  return candidates;
}

function normalizeGitHubBlobUrl(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 5) return null;
  const [owner, repo, kind, branch, ...pathParts] = parts;
  if (!owner || !repo || !branch || pathParts.length === 0) return null;
  if (kind !== "blob" && kind !== "raw") return null;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${pathParts.map(encodeURIComponent).join("/")}`;
}

export function resolveGitHubReadmeAssetUrl(
  src: string,
  meta: Pick<GitHubVaultRepoMeta, "owner" | "name" | "defaultBranch">,
): string | null {
  const clean = src.trim();
  if (!clean || clean.startsWith("data:")) return null;

  if (clean.startsWith("//")) return `https:${clean}`;

  try {
    const absolute = new URL(clean);
    const host = absolute.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "github.com") return normalizeGitHubBlobUrl(absolute) ?? absolute.toString();
    return absolute.toString();
  } catch {
    // Relative README asset.
  }

  const withoutAnchor = clean.split("#")[0]?.split("?")[0]?.trim();
  if (!withoutAnchor) return null;
  const normalizedPath = withoutAnchor.replace(/^\.?\//, "");
  if (!normalizedPath || normalizedPath.startsWith("../")) return null;

  return `https://raw.githubusercontent.com/${encodeURIComponent(meta.owner)}/${encodeURIComponent(
    meta.name,
  )}/${encodeURIComponent(meta.defaultBranch)}/${normalizedPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function isLikelyBadge(c: ImageCandidate): boolean {
  const haystack = `${c.alt} ${c.src}`.toLowerCase();
  return /badge|shield|stars?|forks?|license|npm|downloads?|version|build|coverage|twitter|follow|discord|sponsor/.test(
    haystack,
  );
}

function scoreImageCandidate(c: ImageCandidate, resolvedUrl: string): number {
  if (isLikelyBadge(c)) return -1000;

  const haystack = `${c.alt} ${c.src} ${resolvedUrl}`.toLowerCase();
  let score = 0;

  if (/\b(app[-_\s]?icon|icon|logo|brand|mark)\b/.test(haystack)) score += 90;
  if (/(^|\/)(icon|logo|app-icon)\.(png|jpe?g|webp|svg|ico)$/i.test(resolvedUrl)) score += 80;
  if (c.index < 2_500) score += 25;
  if (/\.(png|jpe?g|webp|svg|ico)(\?|$)/i.test(resolvedUrl)) score += 15;
  if (/screenshot|demo|preview|banner|hero|video|gif/i.test(haystack)) score -= 35;

  return score;
}

async function urlExists(url: string): Promise<boolean> {
  const res = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
    headers: { "User-Agent": "MyLifeOSVaultBot/1.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }).catch(() => null);
  return !!res?.ok;
}

async function resolveReadmeIcon(markdown: string, meta: GitHubVaultRepoMeta): Promise<string | null> {
  const scored = extractReadmeImageCandidates(markdown)
    .map((candidate): ScoredImageCandidate | null => {
      const resolvedUrl = resolveGitHubReadmeAssetUrl(candidate.src, meta);
      if (!resolvedUrl) return null;
      return {
        ...candidate,
        resolvedUrl,
        score: scoreImageCandidate(candidate, resolvedUrl),
      };
    })
    .filter((candidate): candidate is ScoredImageCandidate => candidate != null && candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const candidate of scored.slice(0, 6)) {
    if (await urlExists(candidate.resolvedUrl)) return candidate.resolvedUrl;
  }

  return null;
}

async function resolveCommonRepoIcon(meta: GitHubVaultRepoMeta): Promise<string | null> {
  const commonPaths = [
    "assets/icon.png",
    "assets/app-icon.png",
    "assets/logo.png",
    "assets/icon.svg",
    "assets/logo.svg",
    "build/icon.png",
    "build/icons/icon.png",
    "public/icon.png",
    "public/logo.png",
    "resources/icon.png",
    "src/assets/icon.png",
    "src/assets/logo.png",
  ];

  for (const path of commonPaths) {
    const url = resolveGitHubReadmeAssetUrl(path, meta);
    if (url && (await urlExists(url))) return url;
  }
  return null;
}

function makeHintLines(meta: GitHubVaultRepoMeta, readmeMarkdown: string): string[] {
  const lines = [
    `GitHub repo: ${meta.fullName}`,
    `Canonical URL: ${meta.canonicalUrl}`,
    `Repository name: ${meta.name}`,
  ];
  if (meta.description) lines.push(`Repository description: ${meta.description}`);
  if (meta.homepage) lines.push(`Project homepage: ${meta.homepage}`);
  if (meta.topics.length) lines.push(`GitHub topics: ${meta.topics.join(", ")}`);
  if (meta.stars != null) lines.push(`GitHub stars: ${meta.stars}`);
  if (meta.license) lines.push(`License: ${meta.license}`);
  lines.push(`README markdown excerpt:\n${readmeMarkdown.slice(0, README_HINT_MAX_CHARS)}`);
  return lines;
}

export async function buildGitHubVaultContext(inputUrl: string): Promise<GitHubVaultContext | null> {
  const ref = parseGitHubRepoUrl(inputUrl);
  if (!ref) return null;

  const meta = await fetchGitHubRepoMeta(ref.owner, ref.repo);
  if (!meta) return null;

  const readme = await fetchGitHubDefaultReadme({ owner: ref.owner, repo: ref.repo });
  const readmeMarkdown = readme?.markdown ?? "";
  const iconUrl =
    (readmeMarkdown ? await resolveReadmeIcon(readmeMarkdown, meta) : null) ??
    (await resolveCommonRepoIcon(meta));

  return {
    canonicalUrl: meta.canonicalUrl,
    repoMeta: meta,
    readmeMarkdown,
    iconUrl,
    hintLines: makeHintLines(meta, readmeMarkdown),
  };
}
