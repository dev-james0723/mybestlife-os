import { encodeCodeContent } from "@/lib/knowledge/code-content";

export type GitHubRepoRef = {
  owner: string;
  repo: string;
};

const RESERVED_FIRST_SEGMENTS = new Set([
  "features",
  "topics",
  "collections",
  "sponsors",
  "marketplace",
  "explore",
  "settings",
  "orgs",
  "users",
  "login",
  "signup",
  "new",
  "pricing",
  "search",
  "git",
  "about",
  "security",
  "enterprise",
  "copilot",
  "team",
  "customer-stories",
]);

/** Max stored README HTML size (UTF-16 / string length in JS). */
const README_HTML_CAP = 900_000;

/**
 * Parses `https://github.com/{owner}/{repo}` (and common subpaths) into owner/repo.
 * Returns null for non-repo URLs (gist, raw, settings, etc.).
 */
export function parseGitHubRepoUrl(url: string): GitHubRepoRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "github.com") return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0]!;
  const repo = parts[1]!.replace(/\.git$/i, "");

  if (!owner || !repo) return null;
  if (RESERVED_FIRST_SEGMENTS.has(owner.toLowerCase())) return null;
  if (owner.includes(".") && owner.includes("@")) return null;

  return { owner, repo };
}

function readmeApiPath(ref: GitHubRepoRef): string {
  return `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/readme`;
}

function githubApiHeaders(extra: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent": "MyLifeOS-Knowledge/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetches the default-branch README: raw Markdown for AI, GitHub-rendered HTML for display.
 */
export async function fetchGitHubDefaultReadme(
  ref: GitHubRepoRef,
): Promise<{ markdown: string; rawContentForDb: string } | null> {
  const path = readmeApiPath(ref);

  const [rawRes, htmlRes] = await Promise.all([
    fetch(path, {
      headers: githubApiHeaders({ Accept: "application/vnd.github.raw+json" }),
      signal: AbortSignal.timeout(15000),
    }),
    fetch(path, {
      headers: githubApiHeaders({ Accept: "application/vnd.github.html+json" }),
      signal: AbortSignal.timeout(15000),
    }),
  ]);

  if (!rawRes.ok || !htmlRes.ok) {
    return null;
  }

  const markdown = (await rawRes.text()).trim();
  let htmlFragment = (await htmlRes.text()).trim();

  if (!markdown && !htmlFragment) return null;

  // html+json returns the rendered fragment as the response body (not JSON).
  if (!htmlFragment && markdown) {
    return null;
  }

  if (htmlFragment.length > README_HTML_CAP) {
    htmlFragment = `${htmlFragment.slice(0, README_HTML_CAP)}\n<!-- truncated -->`;
  }

  const documentHtml = wrapGithubReadmeDocument(htmlFragment || `<pre>${escapeHtml(markdown)}</pre>`);

  const rawContentForDb = encodeCodeContent({
    source: documentHtml,
    language: "html",
    preferredView: "preview",
  });

  return {
    markdown: markdown || htmlFragment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    rawContentForDb,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Full HTML document for iframe preview — GitHub's fragment plus GitHub-flavored markdown CSS.
 */
export function wrapGithubReadmeDocument(htmlFragment: string): string {
  const cssHref =
    "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.6.1/github-markdown.min.css";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="stylesheet" href="${cssHref}"/>
  <style>
    html, body { margin: 0; padding: 0; background: var(--color-canvas-default, #fff); color: var(--color-fg-default, #1f2328); }
    body { padding: 16px; box-sizing: border-box; }
    .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; }
    .markdown-body table { display: block; overflow-x: auto; }
  </style>
</head>
<body>
${htmlFragment}
</body>
</html>`;
}
