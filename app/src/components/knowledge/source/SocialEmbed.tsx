"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KnowledgeItem } from "@/types/knowledge";

/** `no-referrer` breaks Facebook / Threads plugin iframes; keep origin for cross-site requests. */
const EMBED_REFERRER_POLICY = "strict-origin-when-cross-origin" as const;
const STANDARD_EMBED_MAX_WIDTH = 640;
const DETAIL_EMBED_FRAME_CLASS = "mx-auto w-full max-w-[640px]";

type Props = {
  item: KnowledgeItem;
  className?: string;
  fallbackText?: string;
  unavailableLabel: string;
  /**
   * When true the embed renders as a small inline preview (used inside the
   * `KnowledgeCard` thumbnail). The fullscreen button + scrolling chrome are
   * suppressed and the iframe is forced non-interactive.
   */
  compact?: boolean;
};

/**
 * Renders a social post's `embedHtml` inside the knowledge card / detail view.
 *
 * Two render paths depending on what the provider returned:
 *   1. Direct iframe embed (Instagram /embed/, Facebook /plugins/, Threads /embed)
 *      → render the iframe directly so the cross-origin embed loads correctly.
 *      A nested sandboxed iframe would break Instagram/Facebook embeds because
 *      sandbox-without-`allow-same-origin` propagates to nested iframes and
 *      blocks their cookie/CSP-dependent content.
 *   2. Blockquote-style embed (X, Threads oEmbed, Reddit, Instagram via Meta
 *      oEmbed) → render inside a sandboxed `srcDoc` iframe with the provider's
 *      official enhancement script. This protects the host app from arbitrary
 *      JS / CSS while still letting the provider script hydrate the post.
 */
export function SocialEmbed({
  item,
  className,
  fallbackText,
  unavailableLabel,
  compact = false,
}: Props) {
  const embedHtml = item.embedHtml ?? "";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);
  const [fullscreen, setFullscreen] = useState(false);

  const provider = effectiveEmbedProvider(item);

  const directIframe = useMemo(() => parseSingleIframe(embedHtml), [embedHtml]);

  const srcDoc = useMemo(() => {
    if (!embedHtml || directIframe) return null;
    return buildEmbedDocument(embedHtml, provider);
  }, [embedHtml, provider, directIframe]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (typeof event.data !== "object" || event.data === null) return;
      const data = event.data as { __knowledgeEmbedHeight?: unknown };
      const h = data.__knowledgeEmbedHeight;
      if (typeof h === "number" && h > 60 && h < 4000) {
        setHeight(Math.ceil(h));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Esc to exit fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [fullscreen]);

  if (!embedHtml || (!directIframe && !srcDoc)) {
    return (
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        <p>{unavailableLabel}</p>
        {fallbackText && (
          <p className="whitespace-pre-wrap break-words text-foreground/80">
            {fallbackText}
          </p>
        )}
      </div>
    );
  }

  const showChrome = !compact;

  if (directIframe) {
    const frameMaxWidth = Math.min(
      directIframe.width ?? STANDARD_EMBED_MAX_WIDTH,
      STANDARD_EMBED_MAX_WIDTH,
    );

    return (
      <>
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border bg-background",
            !compact && DETAIL_EMBED_FRAME_CLASS,
            className,
          )}
          style={!compact ? { maxWidth: frameMaxWidth } : undefined}
        >
          <iframe
            ref={iframeRef}
            title={`${item.title} — embedded post`}
            src={directIframe.src}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy={EMBED_REFERRER_POLICY}
            // Allow the user to scroll inside the embed when the post is
            // taller than the visible iframe height.
            scrolling={compact ? "no" : "auto"}
            className="block w-full"
            style={{
              height: directIframe.height,
              minHeight: compact ? 0 : 320,
              border: 0,
            }}
          />
          {showChrome && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreen(true);
              }}
              aria-label="Open embed fullscreen"
              title="Open fullscreen"
              className="absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {fullscreen && showChrome && (
          <FullscreenEmbedOverlay
            title={item.title}
            src={directIframe.src}
            mode="direct"
            onClose={() => setFullscreen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border bg-background",
          !compact && DETAIL_EMBED_FRAME_CLASS,
          className,
        )}
      >
        <iframe
          ref={iframeRef}
          title={`${item.title} — embedded post`}
          srcDoc={srcDoc!}
          // `sandbox` stripped of `allow-same-origin` means the document runs in
          // an opaque origin; no postMessage.origin leakage, no cookie access.
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          loading="lazy"
          scrolling={compact ? "no" : "auto"}
          className="block w-full"
          style={{ height, minHeight: compact ? 0 : 220, border: 0 }}
          referrerPolicy={EMBED_REFERRER_POLICY}
        />
        {showChrome && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(true);
            }}
            aria-label="Open embed fullscreen"
            title="Open fullscreen"
            className="absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {fullscreen && showChrome && (
        <FullscreenEmbedOverlay
          title={item.title}
          srcDoc={srcDoc!}
          mode="srcDoc"
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
}

type FullscreenOverlayProps =
  | {
      title: string;
      mode: "direct";
      src: string;
      onClose: () => void;
    }
  | {
      title: string;
      mode: "srcDoc";
      srcDoc: string;
      onClose: () => void;
    };

function FullscreenEmbedOverlay(props: FullscreenOverlayProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${props.title} — fullscreen embed`}
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm text-white">
        <span className="line-clamp-1 min-w-0 flex-1 font-medium">{props.title}</span>
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close fullscreen"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden px-2 pb-4 sm:px-6">
        <div className="mx-auto h-full max-w-[720px] overflow-hidden rounded-lg bg-background shadow-2xl">
          {props.mode === "direct" ? (
            <iframe
              title={props.title}
              src={props.src}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy={EMBED_REFERRER_POLICY}
              scrolling="auto"
              className="block h-full w-full"
              style={{ border: 0 }}
            />
          ) : (
            <iframe
              title={props.title}
              srcDoc={props.srcDoc}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              loading="lazy"
              referrerPolicy={EMBED_REFERRER_POLICY}
              scrolling="auto"
              className="block h-full w-full"
              style={{ border: 0 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * When `provider` is missing on older rows, blockquote-style embeds still need
 * the right widgets.js — infer from `sourceType`.
 */
function effectiveEmbedProvider(item: KnowledgeItem): string {
  if (item.provider) return item.provider;
  switch (item.sourceType) {
    case "social_x_post":
      return "x";
    case "social_instagram_post":
    case "social_instagram_reel":
      return "instagram";
    case "social_threads_post":
      return "threads";
    case "social_reddit_post":
      return "reddit";
    case "social_facebook_post":
    case "social_facebook_video_post":
      return "facebook";
    default:
      return "web";
  }
}

const TRUSTED_EMBED_HOSTS = new Set([
  "www.instagram.com",
  "instagram.com",
  "www.facebook.com",
  "facebook.com",
  "www.threads.com",
  "threads.com",
  "www.threads.net",
  "threads.net",
  "platform.twitter.com",
  "publish.twitter.com",
  "twitter.com",
  "x.com",
  "embed.reddit.com",
  "www.reddit.com",
  "reddit.com",
  "iframe.ly",
  "cdn.iframe.ly",
]);

function parseSingleIframe(
  html: string,
): { src: string; height: number; width?: number } | null {
  if (!html) return null;
  const trimmed = html.trim();
  if (!/^<iframe\b/i.test(trimmed)) return null;
  // The trimmed html should be exactly one iframe tag (open + close, optionally
  // with whitespace). If anything trails after </iframe> we still allow it as
  // long as the trailing content is whitespace.
  const closeIdx = trimmed.search(/<\/iframe>/i);
  if (closeIdx === -1) return null;
  const after = trimmed.slice(closeIdx + "</iframe>".length).trim();
  if (after.length > 0) return null;

  const srcMatch = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  const src = srcMatch?.[1] ?? "";
  if (!src) return null;
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return null;
    if (!TRUSTED_EMBED_HOSTS.has(u.hostname.toLowerCase())) return null;
  } catch {
    return null;
  }
  const heightMatch = trimmed.match(/\bheight\s*=\s*["']?(\d+)/i);
  const parsedHeight = heightMatch ? Number.parseInt(heightMatch[1], 10) : NaN;
  const height = Number.isFinite(parsedHeight) && parsedHeight >= 220 && parsedHeight <= 1600
    ? parsedHeight
    : 640;
  const widthMatch = trimmed.match(/\bwidth\s*=\s*["']?(\d+)/i);
  const parsedWidth = widthMatch ? Number.parseInt(widthMatch[1], 10) : NaN;
  const width =
    Number.isFinite(parsedWidth) && parsedWidth >= 260 && parsedWidth <= STANDARD_EMBED_MAX_WIDTH
      ? parsedWidth
      : undefined;

  return { src, height, width };
}

function buildEmbedDocument(fragment: string, provider: string): string {
  const providerScript = providerEnhancements(provider);
  const resizeScript = `
    (function(){
      function report(){
        try {
          var height = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight
          );
          if (parent) parent.postMessage({__knowledgeEmbedHeight: height}, '*');
        } catch (e) {}
      }
      var debounce = null;
      function schedule(){
        clearTimeout(debounce);
        debounce = setTimeout(report, 150);
      }
      window.addEventListener('load', report);
      window.addEventListener('resize', schedule);
      var obs = new MutationObserver(schedule);
      obs.observe(document.body, { childList: true, subtree: true, attributes: true });
      setTimeout(report, 400);
      setTimeout(report, 1200);
      setTimeout(report, 3000);
    })();
  `;

  return `<!doctype html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; font-family: -apple-system, system-ui, sans-serif; }
  body { box-sizing: border-box; padding: 8px; }
  body > iframe, body > blockquote, body > div { box-sizing: border-box !important; display: block; max-width: 100% !important; margin-left: auto !important; margin-right: auto !important; }
  iframe, blockquote { max-width: 100% !important; }
  iframe { display: block; }
  img, video { max-width: 100%; height: auto; }
  .twitter-tweet, .instagram-media, .fb-post, .fb-video, .threads-post, blockquote.reddit-card { margin-left: auto !important; margin-right: auto !important; }
</style>
</head><body>
${fragment}
${providerScript}
<script>${resizeScript}</script>
</body></html>`;
}

function providerEnhancements(provider: string): string {
  // Load the provider's own render script when safe. These scripts run in the
  // sandbox iframe, never in the app context.
  switch (provider) {
    case "x":
      return '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>';
    case "instagram":
      return '<script async src="https://www.instagram.com/embed.js"></script>';
    case "threads":
      return '<script async src="https://www.threads.com/embed.js"></script>';
    case "reddit":
      return '<script async src="https://embed.reddit.com/widgets.js"></script>';
    case "facebook":
      return '<script async src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0"></script>';
    default:
      return "";
  }
}
