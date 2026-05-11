/**
 * Browser feedback when Knowledge Base AI steps finish (summary / thumbnail).
 * Compares previous in-memory item vs new row from Realtime (payload.old is often incomplete).
 * Sound + Web Notifications; respects tab visibility and reduced-motion preference.
 */

import type { KnowledgeItem } from "@/types/knowledge";

const DING_DURATION_S = 0.18;
const DING_FREQ_HZ = 880;
const DING_GAIN = 0.07;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Short ding in-page only when the tab is visible and motion is not reduced (web cannot read OS mute). */
export function canPlayKnowledgeFeedbackSound(): boolean {
  if (typeof window === "undefined") return false;
  if (document.visibilityState !== "visible") return false;
  if (prefersReducedMotion()) return false;
  return true;
}

/**
 * Desktop notification: when we play our own ding (visible tab, no reduced motion), keep the
 * system notification silent to avoid double chime; otherwise allow OS sound (e.g. tab in background).
 */
export async function showKnowledgeBrowserNotification(params: {
  title: string;
  body: string;
  tag: string;
}): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return;

  const silent = canPlayKnowledgeFeedbackSound();
  try {
    new Notification(params.title, {
      body: params.body,
      tag: params.tag,
      silent,
    });
  } catch {
    /* ignore */
  }
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    try {
      sharedAudioContext = new Ctx();
    } catch {
      return null;
    }
  }
  return sharedAudioContext;
}

export async function playKnowledgeDing(): Promise<void> {
  if (!canPlayKnowledgeFeedbackSound()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
    if (ctx.state !== "running") return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = DING_FREQ_HZ;
    gain.gain.setValueAtTime(DING_GAIN, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + DING_DURATION_S);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + DING_DURATION_S);
  } catch {
    /* autoplay or context restrictions */
  }
}

/**
 * Call on Realtime UPDATE before merging `next` into the store, passing the previous item from the store.
 */
export async function notifyKnowledgeItemProgressCompared(
  prev: KnowledgeItem | null,
  next: KnowledgeItem,
): Promise<void> {
  const title = next.title.trim() || "Knowledge item";
  const id = next.id;

  const hadSummary = Boolean(prev?.aiSummary?.trim());
  const hasSummary = Boolean(next.aiSummary?.trim());
  const summaryJustFilled = !hadSummary && hasSummary;

  const oldThumb = prev?.thumbnailUrl;
  const newThumb = next.thumbnailUrl;
  const thumbnailJustChanged = Boolean(newThumb) && newThumb !== oldThumb;

  if (summaryJustFilled) {
    await playKnowledgeDing();
    await showKnowledgeBrowserNotification({
      title: "Knowledge Base",
      body: `AI summary ready: ${title}`,
      tag: id ? `knowledge-summary-${id}` : "knowledge-summary",
    });
  }

  if (thumbnailJustChanged) {
    await playKnowledgeDing();
    await showKnowledgeBrowserNotification({
      title: "Knowledge Base",
      body: `Thumbnail ready: ${title}`,
      tag: id ? `knowledge-thumbnail-${id}` : "knowledge-thumbnail",
    });
  }
}
