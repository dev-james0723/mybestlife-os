import { DEFAULT_LOCALE, type AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";

/**
 * Dashboard "Today's Signals" widget copy — the structural twin of
 * `getWeatherWidgetCopy`. English is canonical; zh-TW authored.
 */
export type SignalsWidgetCopy = {
  title: string;
  subtitle: string;
  ariaOpen: string;
  openPage: string;
  retry: string;
  unavailableTitle: string;
  unavailableHint: string;
  demoTag: string;
  caughtUp: string;
  loadingHint: string;
};

const en: SignalsWidgetCopy = {
  title: "Today's Signals",
  subtitle: "Three things worth your attention today",
  ariaOpen: "Open Signals",
  openPage: "Open Signals",
  retry: "Retry",
  unavailableTitle: "Signals unavailable",
  unavailableHint: "Tap to retry or open Signals",
  demoTag: "Demo",
  caughtUp: "You're caught up for today.",
  loadingHint: "Finding today's signals…",
};

const zhTW: DeepPartial<SignalsWidgetCopy> = {
  title: "今日訊號",
  subtitle: "今天值得關注的三件事",
  ariaOpen: "打開訊號",
  openPage: "打開訊號",
  retry: "重試",
  unavailableTitle: "訊號暫時無法載入",
  unavailableHint: "輕觸重試，或打開訊號頁面",
  demoTag: "示範",
  caughtUp: "今天你已看完了。",
  loadingHint: "正在尋找今天的訊號…",
};

const localized = createLocaleCopyMap<SignalsWidgetCopy>(en, { "zh-TW": zhTW });

export function getSignalsWidgetCopy(locale: AppLocale): SignalsWidgetCopy {
  return localized[locale] ?? localized[DEFAULT_LOCALE];
}
