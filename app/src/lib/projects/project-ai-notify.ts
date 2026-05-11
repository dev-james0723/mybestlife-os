/**
 * Browser feedback when project AI setup finishes.
 * Plays a ding sound + shows a browser notification.
 */

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

function canPlaySound(): boolean {
  if (typeof window === "undefined") return false;
  if (document.visibilityState !== "visible") return false;
  if (prefersReducedMotion()) return false;
  return true;
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
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

export async function playProjectDing(): Promise<void> {
  if (!canPlaySound()) return;

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
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + DING_DURATION_S,
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + DING_DURATION_S);
  } catch {
    /* autoplay or context restrictions */
  }
}

export async function showProjectBrowserNotification(params: {
  title: string;
  body: string;
}): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return;

  const silent = canPlaySound();
  try {
    new Notification(params.title, {
      body: params.body,
      tag: "project-ai-setup",
      silent,
    });
  } catch {
    /* ignore */
  }
}

export async function notifyProjectAiComplete(
  projectName: string,
): Promise<void> {
  await playProjectDing();
  await showProjectBrowserNotification({
    title: "Project Setup",
    body: `AI setup complete: ${projectName}`,
  });
}

export function requestNotificationPermission(): void {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission().catch(() => {});
  }
}
