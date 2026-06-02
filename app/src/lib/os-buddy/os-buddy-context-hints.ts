import type { AppLocale } from "@/lib/i18n/app-locale";

function t(locale: AppLocale, en: string[], zhTW: string[]) {
  return locale === "zh-TW" ? zhTW : en;
}

function pickStable(items: string[], key: string) {
  if (items.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length] ?? null;
}

export function getOSBuddyContextHint(params: {
  pathname: string;
  buddyName: string;
  locale: AppLocale;
}): string | null {
  const pathname = params.pathname.toLowerCase();
  const { buddyName, locale } = params;

  if (pathname.includes("/projects")) {
    return pickStable(
      t(
        locale,
        [
          `${buddyName} can help set up a project draft.`,
          `Want ${buddyName} to break this into tasks?`,
        ],
        [
          `${buddyName} 可以幫你整理專案草稿。`,
          `要不要讓 ${buddyName} 幫你拆成任務？`,
        ],
      ),
      pathname,
    );
  }

  if (pathname.includes("/knowledge") || pathname.includes("/ai-knowledge")) {
    return pickStable(
      t(
        locale,
        [
          `${buddyName} can help search your saved knowledge.`,
          `Drop a thought here. ${buddyName} can help organize it later.`,
        ],
        [
          `${buddyName} 可以幫你搜尋已保存的知識。`,
          `先把想法放進來，${buddyName} 之後可以幫你整理。`,
        ],
      ),
      pathname,
    );
  }

  if (pathname.includes("/assets") || pathname.includes("/resources")) {
    return pickStable(
      t(
        locale,
        [
          `${buddyName} can help read a receipt or prepare a visual.`,
          `Add the rough details. ${buddyName} can clean them up.`,
        ],
        [
          `${buddyName} 可以幫你讀取收據或準備圖片。`,
          `先放入大概資料，${buddyName} 可以幫你整理。`,
        ],
      ),
      pathname,
    );
  }

  if (
    pathname.includes("/daily-planner") ||
    pathname.includes("/tasks") ||
    pathname.includes("/planner")
  ) {
    return pickStable(
      t(
        locale,
        [
          `${buddyName} can help turn this into a next step.`,
          "A small next step is enough.",
        ],
        [
          `${buddyName} 可以幫你把這件事變成下一步。`,
          "先完成一個小步驟就夠。",
        ],
      ),
      pathname,
    );
  }

  if (pathname.includes("/settings")) {
    return locale === "zh-TW"
      ? `你可以在這裡自訂 ${buddyName}。`
      : `You can customize ${buddyName} here.`;
  }

  return null;
}
