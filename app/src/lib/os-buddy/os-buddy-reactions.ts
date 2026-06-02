import type { AppLocale } from "@/lib/i18n/app-locale";
import { addOSBuddyEventListener, type OSBuddyEvent } from "./os-buddy-events";
import type { OSBuddyMood } from "@/types/os-buddy";
import type { OSBuddyBubbleType } from "@/stores/os-buddy-store";
import type {
  OSBuddyCompanionCta,
  OSBuddyCompanionKind,
} from "@/lib/os-buddy/os-buddy-companion";

type ReactionHandlers = {
  setMood: (mood: OSBuddyMood) => void;
  temporarilySetMood: (mood: OSBuddyMood, durationMs?: number) => void;
  showBubble: (
    message: string,
    type?: OSBuddyBubbleType,
    options?: {
      durationMs?: number;
      force?: boolean;
      unsolicited?: boolean;
      kind?: OSBuddyCompanionKind;
      cta?: OSBuddyCompanionCta | null;
    },
  ) => void;
};

function t(locale: AppLocale, en: string, zhTW: string) {
  return locale === "zh-TW" ? zhTW : en;
}

function applyReaction(
  event: OSBuddyEvent,
  locale: AppLocale,
  buddyName: string,
  handlers: ReactionHandlers,
) {
  const { setMood, temporarilySetMood, showBubble } = handlers;

  switch (event.type) {
    case "project:generate:start":
      temporarilySetMood("thinking", 2200);
      showBubble(
        t(locale, `${buddyName} is setting up your project…`, `${buddyName} 正在整理你的專案⋯`),
        "context",
      );
      return;
    case "project:generate:success":
      temporarilySetMood("success", 1800);
      showBubble(
        t(locale, `${buddyName} finished setting up your project.`, `${buddyName} 已完成專案設定。`),
        "success",
      );
      return;
    case "project:generate:error":
      temporarilySetMood("error", 2200);
      showBubble(
        t(locale, `${buddyName} couldn’t finish that. Try again.`, `${buddyName} 暫時無法完成，請再試一次。`),
        "error",
      );
      return;
    case "asset:extract:start":
      temporarilySetMood("reading", 2400);
      showBubble(
        t(locale, `${buddyName} is reviewing the details…`, `${buddyName} 正在檢查資料⋯`),
        "context",
      );
      return;
    case "asset:extract:success":
      temporarilySetMood("success", 1500);
      return;
    case "asset:extract:error":
      temporarilySetMood("error", 1800);
      showBubble(
        t(locale, `${buddyName} hit a snag while extracting that.`, `${buddyName} 在擷取時遇到問題。`),
        "error",
      );
      return;
    case "asset:visual:start":
      temporarilySetMood("creating", 2200);
      return;
    case "asset:visual:success":
      temporarilySetMood("success", 1500);
      return;
    case "asset:visual:error":
      temporarilySetMood("error", 1800);
      return;
    case "task:suggest:start":
      temporarilySetMood("thinking", 2000);
      return;
    case "task:suggest:success":
      temporarilySetMood("success", 1400);
      return;
    case "task:suggest:error":
      temporarilySetMood("error", 1800);
      return;
    case "task:complete":
      temporarilySetMood("celebrating", 1800);
      showBubble(
        t(locale, `${buddyName} says: nice work!`, `${buddyName} 說：做得好！`),
        "success",
      );
      return;
    case "habit:complete":
      temporarilySetMood("celebrating", 1700);
      return;
    case "streak:milestone":
      temporarilySetMood("celebrating", 2000);
      showBubble(
        t(
          locale,
          `${buddyName} celebrates your ${event.count}-day streak!`,
          `${buddyName} 為你的 ${event.count} 天連續紀錄歡呼！`,
        ),
        "success",
      );
      return;
    case "focus:start":
      setMood("focused");
      return;
    case "focus:complete":
      temporarilySetMood("success", 1500);
      return;
    case "user:idle":
      setMood("sleepy");
      showBubble(
        t(locale, `${buddyName} is waiting here for you.`, `${buddyName} 在這裡等你回來。`),
        "context",
        { unsolicited: true },
      );
      return;
    case "user:return":
      setMood("idle");
      return;
    case "buddy:clicked":
      temporarilySetMood("playful", 1100);
      return;
    case "buddy:drag:start":
      return;
    case "buddy:drag:end":
      setMood("idle");
      return;
    case "buddy:longpress":
      temporarilySetMood("playful", 1200);
      return;
    case "buddy:walk:start":
      setMood("playful");
      return;
    case "buddy:walk:return":
      return;
    case "buddy:walk:end":
      setMood("idle");
      return;
    case "game:start":
      setMood("focused");
      return;
    case "game:complete":
      temporarilySetMood("celebrating", 1700);
      showBubble(
        t(locale, `${buddyName} says: game complete!`, `${buddyName} 說：遊戲完成！`),
        "game",
      );
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
  return addOSBuddyEventListener((event) => {
    applyReaction(event, params.locale, params.buddyName, params.handlers);
  });
}
