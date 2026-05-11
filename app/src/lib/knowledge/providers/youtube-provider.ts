/**
 * YouTube ingestion adapter.
 *
 * Handles both long-form videos and Shorts. Uses oEmbed for public metadata
 * (no API key required), derives the best static thumbnail, and optionally
 * fetches the transcript up-front when the caller requests it.
 *
 * Transcript strategy (layered):
 *   1. YouTube captions via `youtube-transcript` (fast, free when available)
 *   2. Gemini multimodal fallback (slower; needs GEMINI_API_KEY)
 *   3. Fail gracefully with `transcript_status = 'unavailable'|'failed'`
 */

import {
  buildYouTubeContextFromOEmbed,
  canonicalYouTubeWatchUrl,
  extractYouTubeVideoId,
  fetchYouTubeOEmbed,
  youTubeThumbnailUrl,
} from "@/lib/knowledge/youtube";
import {
  tryFetchYoutubeTranscriptText,
  tryGeminiYoutubeTranscript,
} from "@/lib/knowledge/youtube-transcript";
import type { TranscriptStatus } from "@/types/knowledge-source";
import type { NormalizedIngest } from "./types";
import { degradedResult } from "./types";

export type YouTubeIngestOptions = {
  /** When `true`, attempt transcript fetch at ingestion time. */
  withTranscript?: boolean;
  /** Hint from classifier: shorts vs standard video. */
  isShorts?: boolean;
};

export async function ingestYouTube(
  url: string,
  opts: YouTubeIngestOptions = {},
): Promise<NormalizedIngest & { transcriptText?: string }> {
  const videoId = extractYouTubeVideoId(url);
  const isShorts = Boolean(opts.isShorts) || /\/shorts\//i.test(url);
  const sourceType = isShorts ? "youtube_shorts" : "youtube_video";
  const label = isShorts ? "YouTube Shorts" : "YouTube Video";
  const canonical = canonicalYouTubeWatchUrl(url) ?? url;
  const thumbnailUrl = videoId ? youTubeThumbnailUrl(videoId) : undefined;

  const oembed = await fetchYouTubeOEmbed(url);

  if (!oembed && !videoId) {
    return degradedResult({
      sourceType,
      provider: "youtube",
      category: "video",
      label,
      title: "YouTube Video",
      sourceUrl: url,
      domain: "youtube.com",
      metadata: { domain: "youtube.com", canonicalUrl: canonical },
      extractionStatus: "failed",
      askEnabled: true,
      contentType: "video",
    });
  }

  const title = oembed?.title?.trim() || (videoId ? `Video ${videoId}` : "YouTube Video");
  const contextBlock = oembed ? buildYouTubeContextFromOEmbed(url, oembed) : "";

  let transcriptText: string | null = null;
  let transcriptStatus: TranscriptStatus = "not_requested";
  if (opts.withTranscript) {
    try {
      transcriptText = await tryFetchYoutubeTranscriptText(url);
      if (!transcriptText) {
        transcriptText = await tryGeminiYoutubeTranscript(url);
      }
      transcriptStatus = transcriptText ? "generated" : "unavailable";
    } catch {
      transcriptStatus = "failed";
    }
  }

  const rawContent = [contextBlock, transcriptText ? `Transcript:\n${transcriptText}` : ""]
    .filter((s) => s.trim().length > 0)
    .join("\n\n");

  const extractionStatus = oembed
    ? transcriptText || !opts.withTranscript
      ? "success"
      : "partial"
    : "partial";

  return {
    sourceType,
    provider: "youtube",
    category: "video",
    label,
    title,
    titleSource: oembed?.title ? "extracted" : "fallback",
    sourceUrl: url,
    sourceDomain: "youtube.com",
    thumbnailUrl: oembed?.thumbnail_url?.trim() || thumbnailUrl,
    rawContent: rawContent || undefined,
    aiInputText: rawContent || contextBlock || title,
    metadata: {
      domain: "youtube.com",
      canonicalUrl: canonical,
      externalId: videoId ?? undefined,
      channel: oembed?.author_name ?? undefined,
      author: oembed?.author_name ?? undefined,
    },
    extractionStatus,
    transcriptStatus,
    askEnabled: true,
    contentType: "video",
    transcriptText: transcriptText ?? undefined,
  };
}
