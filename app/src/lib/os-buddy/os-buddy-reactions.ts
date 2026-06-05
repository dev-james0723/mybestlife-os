import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  subscribeToOSBuddyEvents,
  type OSBuddyEvent,
} from "./os-buddy-events";
import type { OSBuddyMood } from "@/types/os-buddy";
import type { OSBuddyBubbleType, OSBuddyMiniGame } from "@/stores/os-buddy-store";
import type {
  OSBuddyCompanionCta,
  OSBuddyCompanionKind,
} from "@/lib/os-buddy/os-buddy-companion";
import { pickOSBuddyDragEndLine } from "@/lib/os-buddy/os-buddy-drag-lines";

type ShowBubbleOptions = {
  durationMs?: number;
  force?: boolean;
  unsolicited?: boolean;
  kind?: OSBuddyCompanionKind;
  cta?: OSBuddyCompanionCta | null;
};

type ReactionHandlers = {
  setMood: (mood: OSBuddyMood) => void;
  temporarilySetMood: (mood: OSBuddyMood, durationMs?: number) => void;
  showBubble: (
    message: string,
    type?: OSBuddyBubbleType,
    options?: ShowBubbleOptions,
  ) => void;
  openMiniGame?: (game: OSBuddyMiniGame) => void;
  setFocusSession?: (session: { durationMinutes?: number | null } | null) => void;
};

function t(locale: AppLocale, en: string, zhTW: string) {
  return locale === "zh-TW" ? zhTW : en;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

export function handleOSBuddyReaction(params: {
  event: OSBuddyEvent;
  buddyName: string;
  locale: AppLocale;
  setMood: (mood: OSBuddyMood) => void;
  temporarilySetMood: (mood: OSBuddyMood, durationMs?: number) => void;
  showBubble: (
    message: string,
    type?: OSBuddyBubbleType,
    options?: ShowBubbleOptions,
  ) => void;
  openMiniGame?: (game: OSBuddyMiniGame) => void;
  setFocusSession?: (session: { durationMinutes?: number | null } | null) => void;
}): void {
  const {
    event,
    locale,
    buddyName,
    setMood,
    temporarilySetMood,
    showBubble,
    setFocusSession,
  } = params;

  switch (event.type) {
    case "project:generate:start":
      setMood("thinking");
      showBubble(
        t(locale, `${buddyName} is setting up your project…`, `${buddyName} 正在整理你的專案⋯`),
        "context",
      );
      return;
    case "project:generate:success":
      temporarilySetMood("success", 1_800);
      showBubble(
        t(locale, `${buddyName} prepared a project draft.`, `${buddyName} 已經準備好專案草稿。`),
        "success",
      );
      return;
    case "project:generate:error":
      temporarilySetMood("error", 1_800);
      showBubble(
        t(locale, `${buddyName} couldn’t finish that. Try again.`, `${buddyName} 暫時無法完成，請再試一次。`),
        "error",
      );
      return;

    case "asset:extract:start":
      setMood("reading");
      showBubble(
        t(locale, `${buddyName} is reading the details…`, `${buddyName} 正在讀取資料⋯`),
        "context",
      );
      return;
    case "asset:extract:success":
      temporarilySetMood("success", 1_500);
      return;
    case "asset:extract:error":
      temporarilySetMood("error", 1_800);
      showBubble(
        t(locale, `${buddyName} couldn’t read that yet.`, `${buddyName} 暫時無法讀取這份資料。`),
        "error",
      );
      return;

    case "asset:visual:start":
      setMood("creating");
      showBubble(
        t(locale, `${buddyName} is creating a visual…`, `${buddyName} 正在製作圖片⋯`),
        "context",
      );
      return;
    case "asset:visual:success":
      temporarilySetMood("success", 1_500);
      return;
    case "asset:visual:error":
      temporarilySetMood("error", 1_800);
      showBubble(
        t(locale, `${buddyName} couldn’t create that visual.`, `${buddyName} 暫時無法製作這張圖片。`),
        "error",
      );
      return;

    case "knowledge:summarize:start":
      setMood("reading");
      showBubble(
        t(locale, `${buddyName} is summarizing this…`, `${buddyName} 正在整理重點⋯`),
        "context",
      );
      return;
    case "knowledge:summarize:success":
      temporarilySetMood("success", 1_600);
      return;
    case "knowledge:summarize:error":
      temporarilySetMood("error", 1_800);
      showBubble(
        t(locale, `${buddyName} couldn’t summarize that yet.`, `${buddyName} 暫時無法整理這段內容。`),
        "error",
      );
      return;

    case "task:suggest:start":
      setMood("thinking");
      showBubble(
        t(locale, `${buddyName} is thinking through your next step…`, `${buddyName} 正在幫你想下一步⋯`),
        "context",
      );
      return;
    case "task:suggest:success":
      temporarilySetMood("success", 1_500);
      return;
    case "task:suggest:error":
      temporarilySetMood("error", 1_800);
      showBubble(
        t(locale, `${buddyName} couldn’t suggest that yet.`, `${buddyName} 暫時無法建議下一步。`),
        "error",
      );
      return;

    case "task:complete":
      temporarilySetMood("celebrating", 1_500);
      showBubble(t(locale, "Nice. One step cleared.", "很好，又完成一步。"), "success");
      return;
    case "habit:complete":
      temporarilySetMood("celebrating", 1_500);
      showBubble(t(locale, "That habit is getting stronger.", "這個習慣正在變穩。"), "success");
      return;
    case "streak:milestone":
      temporarilySetMood("celebrating", 2_200);
      showBubble(
        t(locale, `${event.count}-day streak. Keep it going.`, `連續 ${event.count} 天，繼續保持。`),
        "success",
      );
      return;

    case "focus:start":
      setMood("focused");
      setFocusSession?.({ durationMinutes: event.durationMinutes ?? null });
      showBubble(t(locale, "I’ll stay quiet while you focus.", "你專心，我會安靜陪著。"), "context");
      return;
    case "focus:pause":
      setMood("idle");
      return;
    case "focus:resume":
      setMood("focused");
      return;
    case "focus:complete":
      setFocusSession?.(null);
      temporarilySetMood("success", 2_000);
      showBubble(t(locale, "Focus block complete.", "專注時段完成。"), "success");
      return;

    case "user:idle":
      setMood("sleepy");
      return;
    case "user:return":
      setMood("idle");
      showBubble(t(locale, "Welcome back.", "歡迎回來。"), "context", {
        unsolicited: true,
        durationMs: 2_400,
      });
      return;

    case "buddy:clicked": {
      temporarilySetMood("playful", 1_200);
      const hour = new Date().getHours();
      const midnightLine =
        hour < 6
          ? t(locale, "Still here. Quiet mode.", "我還在。安靜模式。")
          : null;
      const line =
        midnightLine ??
        pick(
          locale === "zh-TW"
            ? [
                "我在這裡。",
                "你可以把我拖到任何位置。",
                "需要我幫你整理一下嗎？",
                "小小的，但很有用。",
              ]
            : [
                "I’m here.",
                "Drag me anywhere.",
                "Need help setting something up?",
                "Tiny but useful.",
              ],
        );
      showBubble(line, "user-triggered", {
        force: true,
        durationMs: 2_500,
      });
      return;
    }
    case "buddy:drag:start":
      setMood("playful");
      return;
    case "buddy:drag:end":
      setMood("idle");
      showBubble(pickOSBuddyDragEndLine(locale), "user-triggered", {
        force: true,
        durationMs: 1_700,
      });
      return;
    case "buddy:longpress":
      temporarilySetMood("playful", 1_200);
      showBubble(t(locale, "OS Buddy menu opened.", "OS Buddy 選單已打開。"), "user-triggered", {
        force: true,
        durationMs: 1_700,
      });
      return;

    case "buddy:walk:start":
      setMood("playful");
      return;
    case "buddy:walk:return":
      return;
    case "buddy:walk:end":
      setMood("idle");
      return;

    case "buddy:air-control:start":
      temporarilySetMood("playful", 1_400);
      showBubble(
        t(
          locale,
          "Air Touch on. Point your index finger, then reach onto me to grab.",
          "隔空觸碰開啟。伸出食指，碰到我就可以抓住我。",
        ),
        "user-triggered",
        { force: true, durationMs: 3_400 },
      );
      return;
    case "buddy:air-control:calibrated":
      temporarilySetMood("success", 1_600);
      showBubble(
        event.quality === "good"
          ? t(locale, "Calibration looks great.", "校準效果很好。")
          : t(locale, "Calibration saved. Good enough to use.", "校準已儲存，可以使用。"),
        "success",
        { force: true, durationMs: 2_600 },
      );
      return;
    case "buddy:air-control:error":
      temporarilySetMood("error", 1_800);
      showBubble(
        event.error ??
          t(locale, "Air Touch ran into a problem.", "隔空觸碰遇到問題。"),
        "error",
        { force: true, durationMs: 3_600 },
      );
      return;
    case "buddy:air-control:end":
      setMood("idle");
      return;
    case "buddy:air-control:gesture":
      // Gesture telemetry only; no bubble spam.
      return;

    case "buddy:free-roam:start":
      setMood("playful");
      return;
    case "buddy:free-roam:end":
      setMood("idle");
      return;
    case "buddy:free-roam:interrupt":
      if (event.reason === "user-click" || event.reason === "user-drag") return;
      setMood("idle");
      return;

    case "game:start":
      setMood(event.game === "clean-desk" ? "reading" : event.game === "focus-tap" ? "focused" : "playful");
      return;
    case "game:complete":
      temporarilySetMood("celebrating", 1_700);
      showBubble(
        t(
          locale,
          `${buddyName} finished with ${event.score ?? 0} points.`,
          `${buddyName} 完成了，得到 ${event.score ?? 0} 分。`,
        ),
        "game",
      );
      return;

    case "birthday:today": {
      temporarilySetMood("celebrating", 3_200);
      const line =
        event.age != null
          ? t(
              locale,
              "Happy birthday. Another year, and still building.",
              "生日快樂。又走了一年，繼續把生活整理成自己的樣子。",
            )
          : t(
              locale,
              "Happy birthday. Make a little space for yourself today.",
              "生日快樂。今天記得留一點時間給自己。",
            );
      showBubble(line, "birthday", {
        force: true,
        durationMs: 5_200,
      });
      return;
    }
    case "birthday:upcoming":
      temporarilySetMood("playful", 1_400);
      showBubble(
        t(
          locale,
          "Your birthday is coming up. Want to protect a little time for yourself?",
          "你的生日快到了。要不要先留一點時間給自己？",
        ),
        "birthday",
        {
          durationMs: 4_600,
          unsolicited: true,
        },
      );
      return;
    case "birthday:set":
      temporarilySetMood("success", 1_400);
      showBubble(t(locale, "Birthday Mode is set.", "生日模式已設定。"), "success", {
        force: true,
        durationMs: 2_200,
      });
      return;
    case "birthday:clear":
      setMood("idle");
      showBubble(t(locale, "Birthday Mode is off.", "生日模式已關閉。"), "system", {
        force: true,
        durationMs: 2_200,
      });
      return;
    default:
      return;
  }
}

export function registerOSBuddyReactions(params: {
  locale: AppLocale;
  buddyName: string;
  handlers: ReactionHandlers;
}) {
  return subscribeToOSBuddyEvents((event) => {
    handleOSBuddyReaction({
      event,
      buddyName: params.buddyName,
      locale: params.locale,
      ...params.handlers,
    });
  });
}
