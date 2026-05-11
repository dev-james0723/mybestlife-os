/**
 * Input classification layer.
 *
 * Given a URL or a chunk of pasted text, decide the fine-grained
 * {@link SourceType}, its broader category, and the provider. Pure, sync,
 * runs in both client and server contexts.
 *
 * Order of operations:
 *   1. If the input parses as a URL, match the hostname/path against known
 *      providers (YouTube Shorts / Video, X, Facebook, Instagram, Reddit,
 *      GitHub repo, generic article).
 *   2. Otherwise detect code / markup language using
 *      {@link ../knowledge/code-content.ts} heuristics, then pick a
 *      `code_*`, `markdown_input`, `html_input` or `plain_text` type.
 */

import {
  detectCodeLanguage,
  looksLikeSourceCode,
  looksLikeMarkdown,
  type KnowledgeCodeLanguage,
} from "@/lib/knowledge/code-content";
import { extractYouTubeVideoId, isYouTubePageUrl } from "@/lib/knowledge/youtube";
import { parseGitHubRepoUrl } from "@/lib/knowledge/github-readme";
import type {
  KnowledgeCategory,
  Provider,
  SourceMetadata,
  SourceType,
} from "@/types/knowledge-source";

export type ClassifyResult = {
  sourceType: SourceType;
  provider: Provider;
  category: KnowledgeCategory;
  /** Human-readable label (e.g. "Article", "YouTube Shorts", "X Post"). */
  label: string;
  /** Whether `Ask the Document` / `Ask the Video` is supported for this type. */
  askEnabled: boolean;
  /** Whether a visual "preview" mode is meaningful for this type. */
  supportsPreview: boolean;
  /** Default `display_mode_default` if we need to save one. */
  defaultDisplayMode: "preview" | "source";
  /** Best-guess provider metadata discovered at classification time. */
  metadata: SourceMetadata;
  /** Canonical URL if we derived one. */
  canonicalUrl?: string;
};

/**
 * Primary entry point. Accepts either a URL string or free-form text/code.
 * Always returns a result — plain_text is the safe fallback.
 */
export function classifyKnowledgeInput(input: string): ClassifyResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return defaultPlainText();
  }

  const urlResult = classifyUrl(trimmed);
  if (urlResult) return urlResult;

  return classifyText(trimmed);
}

// ── URL classification ────────────────────────────────────────────────────

const SOCIAL_HOSTS: Record<string, Provider> = {
  "x.com": "x",
  "twitter.com": "x",
  "mobile.twitter.com": "x",
  "facebook.com": "facebook",
  "m.facebook.com": "facebook",
  "fb.com": "facebook",
  "fb.watch": "facebook",
  "instagram.com": "instagram",
  "threads.net": "threads",
  "threads.com": "threads",
  "reddit.com": "reddit",
  "old.reddit.com": "reddit",
  "new.reddit.com": "reddit",
  "m.reddit.com": "reddit",
  "redd.it": "reddit",
};

export function classifyUrl(raw: string): ClassifyResult | null {
  let url: URL;
  try {
    // Bare domain paste often lacks scheme; only accept full URLs here.
    url = new URL(raw);
  } catch {
    // Try prefixing https if it looks URL-ish but missing scheme.
    if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(raw)) {
      try {
        url = new URL(`https://${raw}`);
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");

  // ── YouTube ──
  if (isYouTubePageUrl(url.toString())) {
    const videoId = extractYouTubeVideoId(url.toString());
    const isShorts = /\/shorts\//i.test(url.pathname);
    const sourceType: SourceType = isShorts ? "youtube_shorts" : "youtube_video";
    return {
      sourceType,
      provider: "youtube",
      category: "video",
      label: isShorts ? "YouTube Shorts" : "YouTube Video",
      askEnabled: true,
      supportsPreview: true,
      defaultDisplayMode: "preview",
      metadata: {
        domain: host,
        externalId: videoId ?? undefined,
        canonicalUrl: videoId
          ? isShorts
            ? `https://www.youtube.com/shorts/${videoId}`
            : `https://www.youtube.com/watch?v=${videoId}`
          : url.toString(),
      },
      canonicalUrl: videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : url.toString(),
    };
  }

  // ── GitHub repo ──
  const gh = parseGitHubRepoUrl(url.toString());
  if (gh) {
    return {
      sourceType: "github_repository",
      provider: "github",
      category: "repository",
      label: "GitHub Repository",
      askEnabled: true,
      supportsPreview: true,
      defaultDisplayMode: "preview",
      metadata: {
        domain: host,
        owner: gh.owner,
        repo: gh.repo,
        handle: `${gh.owner}/${gh.repo}`,
        canonicalUrl: `https://github.com/${gh.owner}/${gh.repo}`,
      },
      canonicalUrl: `https://github.com/${gh.owner}/${gh.repo}`,
    };
  }

  // ── Social media ──
  const provider = SOCIAL_HOSTS[host];
  if (provider) {
    const socialResult = classifySocialUrl(url, host, provider, path);
    if (socialResult) return socialResult;
  }

  // ── Default: article / generic URL ──
  return {
    sourceType: "article_url",
    provider: "web",
    category: "article",
    label: "Article",
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
    metadata: { domain: host, canonicalUrl: url.toString() },
    canonicalUrl: url.toString(),
  };
}

function classifySocialUrl(
  url: URL,
  host: string,
  provider: Provider,
  path: string,
): ClassifyResult | null {
  const segs = path.split("/").filter(Boolean);

  // X / Twitter: /{handle}/status/{id} (optionally /photo/N, /video/N)
  if (provider === "x") {
    const statusIdx = segs.indexOf("status");
    if (statusIdx >= 1 && segs[statusIdx + 1]) {
      const handle = segs[statusIdx - 1];
      const externalId = segs[statusIdx + 1];
      const isVideoPath = segs.includes("video");
      return {
        sourceType: "social_x_post",
        provider: "x",
        category: "social_media",
        label: isVideoPath ? "X Video Post" : "X Post",
        askEnabled: false,
        supportsPreview: true,
        defaultDisplayMode: "preview",
        metadata: {
          domain: host,
          handle: handle ? `@${handle}` : undefined,
          externalId,
          canonicalUrl: `https://x.com/${handle}/status/${externalId}`,
        },
        canonicalUrl: `https://x.com/${handle}/status/${externalId}`,
      };
    }
    // Fallback for bare profile / timeline URLs — treat as article-ish so the
    // user still gets a card, but keep provider=x so we could detect later.
    return {
      sourceType: "social_x_post",
      provider: "x",
      category: "social_media",
      label: "X Post",
      askEnabled: false,
      supportsPreview: true,
      defaultDisplayMode: "preview",
      metadata: { domain: host, canonicalUrl: url.toString() },
      canonicalUrl: url.toString(),
    };
  }

  // Instagram: /p/{code} (post), /reel/{code} (reel), /tv/{code} (video)
  if (provider === "instagram") {
    if (segs[0] === "reel" || segs[0] === "reels") {
      return {
        sourceType: "social_instagram_reel",
        provider: "instagram",
        category: "social_media",
        label: "Instagram Reel",
        askEnabled: false,
        supportsPreview: true,
        defaultDisplayMode: "preview",
        metadata: {
          domain: host,
          externalId: segs[1] ?? undefined,
          canonicalUrl: url.toString(),
        },
        canonicalUrl: url.toString(),
      };
    }
    if (segs[0] === "p" || segs[0] === "tv") {
      return {
        sourceType: "social_instagram_post",
        provider: "instagram",
        category: "social_media",
        label: "Instagram Post",
        askEnabled: false,
        supportsPreview: true,
        defaultDisplayMode: "preview",
        metadata: {
          domain: host,
          externalId: segs[1] ?? undefined,
          canonicalUrl: url.toString(),
        },
        canonicalUrl: url.toString(),
      };
    }
    return {
      sourceType: "social_instagram_post",
      provider: "instagram",
      category: "social_media",
      label: "Instagram Post",
      askEnabled: false,
      supportsPreview: true,
      defaultDisplayMode: "preview",
      metadata: { domain: host, canonicalUrl: url.toString() },
      canonicalUrl: url.toString(),
    };
  }

  // Facebook: /{page}/posts/{id}, /watch/?v=, /{user}/videos/{id}, fb.watch/{id}
  if (provider === "facebook") {
    const isVideoPath =
      host === "fb.watch" ||
      path.startsWith("/watch") ||
      segs.includes("videos");
    return {
      sourceType: isVideoPath ? "social_facebook_video_post" : "social_facebook_post",
      provider: "facebook",
      category: "social_media",
      label: isVideoPath ? "Facebook Video Post" : "Facebook Post",
      askEnabled: false,
      supportsPreview: true,
      defaultDisplayMode: "preview",
      metadata: { domain: host, canonicalUrl: url.toString() },
      canonicalUrl: url.toString(),
    };
  }

  // Threads: /@{username}/post/{code} or /t/{code}
  if (provider === "threads") {
    const postIdx = segs.indexOf("post");
    const externalId =
      segs[0] === "t" ? segs[1] : postIdx >= 0 ? segs[postIdx + 1] : undefined;
    const username = segs[0]?.startsWith("@") ? segs[0] : undefined;
    const canonicalUrl =
      segs[0] === "t" && externalId
        ? `https://www.threads.com/t/${externalId}`
        : username && externalId
          ? `https://www.threads.com/${username}/post/${externalId}`
          : url.toString();
    return {
      sourceType: "social_threads_post",
      provider: "threads",
      category: "social_media",
      label: "Threads Post",
      askEnabled: false,
      supportsPreview: true,
      defaultDisplayMode: "preview",
      metadata: {
        domain: host,
        handle: username,
        externalId,
        canonicalUrl,
      },
      canonicalUrl,
    };
  }

  // Reddit: /r/{sub}/comments/{id}/{slug}
  if (provider === "reddit") {
    const subIdx = segs.indexOf("r");
    const subreddit = subIdx >= 0 ? segs[subIdx + 1] : undefined;
    const commentsIdx = segs.indexOf("comments");
    const externalId = commentsIdx >= 0 ? segs[commentsIdx + 1] : undefined;
    return {
      sourceType: "social_reddit_post",
      provider: "reddit",
      category: "social_media",
      label: "Reddit Post",
      askEnabled: false,
      supportsPreview: true,
      defaultDisplayMode: "preview",
      metadata: {
        domain: host,
        subreddit: subreddit ? `r/${subreddit}` : undefined,
        externalId,
        canonicalUrl: url.toString(),
      },
      canonicalUrl: url.toString(),
    };
  }

  return null;
}

// ── Text / code classification ────────────────────────────────────────────

const CODE_TYPE_MAP: Record<KnowledgeCodeLanguage, SourceType> = {
  html: "html_input",
  css: "code_css",
  python: "code_python",
  javascript: "code_javascript",
  typescript: "code_typescript",
  java: "code_java",
  php: "code_php",
  sql: "code_sql",
  bash: "code_bash",
  json: "code_json",
  text: "plain_text",
};

const CODE_TYPE_LABELS: Record<SourceType, string> = {
  html_input: "HTML",
  markdown_input: "Markdown",
  code_python: "Python",
  code_javascript: "JavaScript",
  code_typescript: "TypeScript",
  code_java: "Java",
  code_php: "PHP",
  code_css: "CSS",
  code_sql: "SQL",
  code_bash: "Shell",
  code_json: "JSON",
  plain_text: "Plain Text",
  // URL types (not used by this function but satisfy the Record type)
  article_url: "Article",
  youtube_video: "YouTube Video",
  youtube_shorts: "YouTube Shorts",
  social_x_post: "X Post",
  social_facebook_post: "Facebook Post",
  social_facebook_video_post: "Facebook Video Post",
  social_instagram_post: "Instagram Post",
  social_instagram_reel: "Instagram Reel",
  social_threads_post: "Threads Post",
  social_reddit_post: "Reddit Post",
  github_repository: "GitHub Repository",
  file_upload: "File",
  voice_memo: "Voice Memo",
  url_other: "Link",
};

/** Public helper: human label for a SourceType. */
export function sourceTypeLabel(sourceType: SourceType): string {
  return CODE_TYPE_LABELS[sourceType] ?? "Item";
}

export function classifyText(raw: string): ClassifyResult {
  const trimmed = raw.trim();
  if (!trimmed) return defaultPlainText();

  if (looksLikeMarkdown(trimmed)) {
    return {
      sourceType: "markdown_input",
      provider: "local",
      category: "markup",
      label: "Markdown",
      askEnabled: true,
      supportsPreview: true,
      defaultDisplayMode: "preview",
      metadata: { codeLanguage: "markdown" },
    };
  }

  const lang = detectCodeLanguage(trimmed);
  if (lang) {
    const sourceType = CODE_TYPE_MAP[lang];
    return {
      sourceType,
      provider: "local",
      category: sourceType === "html_input" ? "markup" : "code",
      label: CODE_TYPE_LABELS[sourceType],
      askEnabled: true,
      supportsPreview: sourceType === "html_input",
      defaultDisplayMode: sourceType === "html_input" ? "preview" : "source",
      metadata: { codeLanguage: lang },
    };
  }

  if (looksLikeSourceCode(trimmed)) {
    return {
      sourceType: "plain_text",
      provider: "local",
      category: "code",
      label: "Source Code",
      askEnabled: true,
      supportsPreview: false,
      defaultDisplayMode: "source",
      metadata: { codeLanguage: "text" },
    };
  }

  return defaultPlainText();
}

function defaultPlainText(): ClassifyResult {
  return {
    sourceType: "plain_text",
    provider: "local",
    category: "note",
    label: "Plain Text",
    askEnabled: true,
    supportsPreview: false,
    defaultDisplayMode: "source",
    metadata: {},
  };
}
