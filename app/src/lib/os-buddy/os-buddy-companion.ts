export const OS_BUDDY_COMPANION_KINDS = [
  "schedule",
  "quote",
  "weather",
  "reminder",
  "compliment",
  "game",
  "fallback",
] as const;

export type OSBuddyCompanionKind = (typeof OS_BUDDY_COMPANION_KINDS)[number];

export type OSBuddyMiniGame = "pixel-catch" | "focus-tap" | "clean-desk" | "play-ball";

export type OSBuddyCompanionSource = "ai" | "local" | "fallback";

export type OSBuddyCompanionCta = {
  label: string;
  game: OSBuddyMiniGame;
};

export type OSBuddyCompanionResponse = {
  message: string;
  kind: OSBuddyCompanionKind;
  source: OSBuddyCompanionSource;
  cta?: OSBuddyCompanionCta | null;
};

export type OSBuddyCompactScheduleItem = {
  title: string;
  sourceType: string;
  startTime: string | null;
  endTime: string | null;
  overdue?: boolean;
  priority?: string | null;
};

export type OSBuddyCompactQuote = {
  text: string;
  author: string | null;
  favorite?: boolean;
};

export type OSBuddyCompactWeather = {
  status: "ok" | "error" | "loading";
  location?: string;
  temperature?: number;
  condition?: string;
  rainChance?: number;
  alertLevel?: "minor" | "moderate" | "severe" | null;
  alertKey?: string | null;
};

export type OSBuddyCompactContext = {
  locale: string;
  buddyName: string;
  today: string;
  schedule: {
    load: string | null;
    itemCount: number;
    overdueCount: number;
    scheduledMinutes: number;
    freeWindows: string[];
    items: OSBuddyCompactScheduleItem[];
  };
  weather: OSBuddyCompactWeather | null;
  quotes: OSBuddyCompactQuote[];
  memories: {
    journal: string[];
    ideas: string[];
    gratefulThings: string[];
  };
  games: OSBuddyMiniGame[];
};

type WeightedKind = {
  kind: OSBuddyCompanionKind;
  weight: number;
};

const MAX_RECENT_KIND_HISTORY = 6;
const SOON_WINDOW_MINUTES = 90;

function isZh(locale: string) {
  return locale === "zh-TW" || locale.startsWith("zh");
}

function clampText(text: string, maxChars: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, Math.max(0, maxChars - 1)).trim()}...`;
}

export function compactOSBuddyText(value: unknown, maxChars = 80): string {
  if (typeof value !== "string") return "";
  return clampText(value.replace(/<[^>]*>/g, " "), maxChars);
}

function minutesOfDay(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesUntilToday(time: string | null | undefined, now: Date): number | null {
  const target = minutesOfDay(time);
  if (target == null) return null;
  const current = now.getHours() * 60 + now.getMinutes();
  const delta = target - current;
  return delta >= 0 ? delta : null;
}

export function getNextScheduleItem(
  context: OSBuddyCompactContext,
  now: Date = new Date(),
): { item: OSBuddyCompactScheduleItem; minutesUntil: number | null } | null {
  const upcoming = context.schedule.items
    .map((item) => ({ item, minutesUntil: minutesUntilToday(item.startTime, now) }))
    .filter((entry): entry is { item: OSBuddyCompactScheduleItem; minutesUntil: number } =>
      entry.minutesUntil != null,
    )
    .sort((a, b) => a.minutesUntil - b.minutesUntil);

  if (upcoming[0]) return upcoming[0];
  const firstUntimed = context.schedule.items[0];
  return firstUntimed ? { item: firstUntimed, minutesUntil: null } : null;
}

function hasWeatherAlert(context: OSBuddyCompactContext) {
  return (
    context.weather?.status === "ok" &&
    (context.weather.alertLevel === "moderate" || context.weather.alertLevel === "severe")
  );
}

function hasSoonReminder(context: OSBuddyCompactContext, now: Date) {
  if (context.schedule.overdueCount > 0) return true;
  const next = getNextScheduleItem(context, now);
  return next?.minutesUntil != null && next.minutesUntil <= SOON_WINDOW_MINUTES;
}

function hasMemoryContext(context: OSBuddyCompactContext) {
  return (
    context.memories.journal.length > 0 ||
    context.memories.ideas.length > 0 ||
    context.memories.gratefulThings.length > 0
  );
}

function hasScheduleContext(context: OSBuddyCompactContext) {
  return context.schedule.itemCount > 0 || context.schedule.freeWindows.length > 0;
}

function eligibleWeightedKinds(context: OSBuddyCompactContext): WeightedKind[] {
  const kinds: WeightedKind[] = [];

  if (hasScheduleContext(context)) kinds.push({ kind: "schedule", weight: 22 });
  if (context.quotes.length > 0) kinds.push({ kind: "quote", weight: 18 });
  if (context.weather?.status === "ok") kinds.push({ kind: "weather", weight: 14 });
  if (context.schedule.itemCount > 0 || context.schedule.overdueCount > 0) {
    kinds.push({ kind: "reminder", weight: 16 });
  }
  if (hasMemoryContext(context)) kinds.push({ kind: "compliment", weight: 18 });
  if (context.games.length > 0) kinds.push({ kind: "game", weight: 12 });

  if (kinds.length === 0) kinds.push({ kind: "fallback", weight: 1 });
  return kinds;
}

function weightedPick(kinds: WeightedKind[], random: number): OSBuddyCompanionKind {
  const total = kinds.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return kinds[0]?.kind ?? "fallback";
  let cursor = Math.max(0, Math.min(0.999999, random)) * total;
  for (const item of kinds) {
    cursor -= item.weight;
    if (cursor <= 0) return item.kind;
  }
  return kinds[kinds.length - 1]?.kind ?? "fallback";
}

export function selectOSBuddyCompanionKind(params: {
  context: OSBuddyCompactContext;
  recentKinds?: OSBuddyCompanionKind[];
  now?: Date;
  random?: number;
}): OSBuddyCompanionKind {
  const now = params.now ?? new Date();
  if (hasWeatherAlert(params.context)) return "weather";
  if (hasSoonReminder(params.context, now)) return "reminder";

  const eligible = eligibleWeightedKinds(params.context);
  const recent = new Set((params.recentKinds ?? []).slice(-2));
  const nonRecent = eligible.filter((item) => !recent.has(item.kind));
  const pool = nonRecent.length > 0 ? nonRecent : eligible;
  return weightedPick(pool, params.random ?? Math.random());
}

export function nextOSBuddyRecentKinds(
  recentKinds: OSBuddyCompanionKind[],
  kind: OSBuddyCompanionKind,
): OSBuddyCompanionKind[] {
  return [...recentKinds, kind].slice(-MAX_RECENT_KIND_HISTORY);
}

function pickOne<T>(items: T[], random: number): T | null {
  if (items.length === 0) return null;
  const index = Math.min(items.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random)) * items.length));
  return items[index] ?? null;
}

function gameLabel(game: OSBuddyMiniGame, locale: string): string {
  if (isZh(locale)) {
    if (game === "play-ball") return "和小夥伴玩球";
    if (game === "clean-desk") return "整理桌面";
    if (game === "focus-tap") return "玩 Focus Tap";
    return "玩 Pixel Catch";
  }
  if (game === "play-ball") return "Play Ball";
  if (game === "clean-desk") return "Clean the Desk";
  if (game === "focus-tap") return "Play Focus Tap";
  return "Play Pixel Catch";
}

function formatMinutesUntil(minutes: number | null, locale: string): string {
  if (minutes == null) return "";
  if (isZh(locale)) {
    if (minutes < 5) return "快開始了";
    return `${minutes} 分鐘後`;
  }
  if (minutes < 5) return "starting soon";
  return `in ${minutes} min`;
}

function weatherMessage(context: OSBuddyCompactContext): string {
  const zh = isZh(context.locale);
  const weather = context.weather;
  if (!weather || weather.status !== "ok") {
    return zh ? "我暫時看不到天氣，但我還是在這裡陪你。" : "I cannot see the weather right now, but I am still here with you.";
  }
  const place = weather.location ? ` ${weather.location}` : "";
  const temp = typeof weather.temperature === "number" ? `${Math.round(weather.temperature)}°C` : "";
  const rain = typeof weather.rainChance === "number" ? weather.rainChance : null;

  if (weather.alertLevel === "severe" || weather.alertLevel === "moderate") {
    return zh
      ? `天氣小提醒：${place.trim() || "附近"}${weather.condition ? ` ${weather.condition}` : ""}${temp ? `，${temp}` : ""}。出門前帶好裝備。`
      : `Weather nudge:${place}${weather.condition ? ` is ${weather.condition}` : ""}${temp ? `, ${temp}` : ""}. Pack a tiny shield before going out.`;
  }

  return zh
    ? `現在${place.trim() || "附近"}${weather.condition ? `是 ${weather.condition}` : "天氣穩定"}${temp ? `，${temp}` : ""}${rain != null ? `，降雨機率 ${rain}%` : ""}。`
    : `Weather check:${place}${weather.condition ? ` is ${weather.condition}` : " looks steady"}${temp ? `, ${temp}` : ""}${rain != null ? `, ${rain}% rain` : ""}.`;
}

function quoteMessage(context: OSBuddyCompactContext, random: number): string {
  const zh = isZh(context.locale);
  const quote = pickOne(context.quotes, random);
  if (!quote) {
    return zh ? "你的 Quote Library 還很安靜。等你放一句喜歡的話進去，我會幫你記得。" : "Your Quote Library is quiet for now. Save one line you love, and I will carry it around.";
  }
  const text = clampText(quote.text, zh ? 52 : 96);
  const author = quote.author ? ` - ${quote.author}` : "";
  return zh ? `Quote Library 抽到這句：「${text}」${author}` : `Quote Library whisper: "${text}"${author}`;
}

function scheduleMessage(context: OSBuddyCompactContext): string {
  const zh = isZh(context.locale);
  const count = context.schedule.itemCount;
  const window = context.schedule.freeWindows[0];
  if (count === 0) {
    return zh ? "今天的行程很清爽。挑一件小事完成，就很有生命力。" : "Your calendar looks roomy today. One tiny brave thing would be enough.";
  }
  if (window) {
    return zh
      ? `今天有 ${count} 件事。我看到一段空檔：${window}，可以留給恢復或深度工作。`
      : `${count} things today. I found a pocket: ${window}. Good for recovery or one deep push.`;
  }
  return zh ? `今天有 ${count} 件事。慢慢來，我會在旁邊守著。` : `${count} things on the board today. Slow paws, steady day.`;
}

function reminderMessage(context: OSBuddyCompactContext, now: Date): string {
  const zh = isZh(context.locale);
  if (context.schedule.overdueCount > 0) {
    return zh
      ? `小提醒：有 ${context.schedule.overdueCount} 件逾期事項。先咬最小的一口就好。`
      : `Tiny nudge: ${context.schedule.overdueCount} overdue item${context.schedule.overdueCount === 1 ? "" : "s"}. Bite the smallest one first.`;
  }

  const next = getNextScheduleItem(context, now);
  if (next) {
    const when = formatMinutesUntil(next.minutesUntil, context.locale);
    return zh
      ? `接下來是「${clampText(next.item.title, 34)}」${when ? `，${when}` : ""}。我幫你盯著。`
      : `Next up: ${clampText(next.item.title, 54)}${when ? `, ${when}` : ""}. I am keeping one pixel eye on it.`;
  }

  return zh ? "今天沒有明確提醒。那就先照顧自己，再推進一小步。" : "No sharp reminders right now. Take care of the human, then move one small tile.";
}

function complimentMessage(context: OSBuddyCompactContext, random: number): string {
  const zh = isZh(context.locale);
  const gratitude = pickOne(context.memories.gratefulThings, random);
  if (gratitude) {
    return zh
      ? `我看到你記下「${clampText(gratitude, 36)}」。會感謝的人，心裡有很亮的地方。`
      : `I saw your gratitude note: "${clampText(gratitude, 58)}". That is a very alive kind of attention.`;
  }

  const journal = pickOne(context.memories.journal, random);
  if (journal) {
    return zh
      ? `你最近在整理「${clampText(journal, 36)}」。願意面對自己，已經很了不起。`
      : `You have been working through "${clampText(journal, 58)}". That kind of honesty counts.`;
  }

  const idea = pickOne(context.memories.ideas, random);
  if (idea) {
    return zh
      ? `你捕捉到「${clampText(idea, 36)}」。你的腦袋真的很會發光。`
      : `You captured "${clampText(idea, 58)}". Your brain keeps leaving little sparks everywhere.`;
  }

  return zh ? "今天也要誇你一下：你還在整理生活，這本身就很勇敢。" : "Tiny compliment: you are still tending your life. That is brave in a quiet way.";
}

function gameMessage(context: OSBuddyCompactContext, random: number): OSBuddyCompanionResponse {
  const zh = isZh(context.locale);
  const game = pickOne(context.games, random) ?? "pixel-catch";
  const label = gameLabel(game, context.locale);
  return {
    kind: "game",
    source: "local",
    message: zh ? "要不要跟我玩一下？只玩一小局也算補充能量。" : "Want to play with me for a tiny round? One small game, then back to hero mode.",
    cta: { label, game },
  };
}

export function buildLocalOSBuddyCompanionResponse(params: {
  kind: OSBuddyCompanionKind;
  context: OSBuddyCompactContext;
  now?: Date;
  random?: number;
  source?: OSBuddyCompanionSource;
}): OSBuddyCompanionResponse {
  const { kind, context } = params;
  const now = params.now ?? new Date();
  const random = params.random ?? Math.random();
  const source = params.source ?? "local";

  if (kind === "game") {
    const response = gameMessage(context, random);
    return { ...response, source };
  }

  const message =
    kind === "weather"
      ? weatherMessage(context)
      : kind === "quote"
        ? quoteMessage(context, random)
        : kind === "schedule"
          ? scheduleMessage(context)
          : kind === "reminder"
            ? reminderMessage(context, now)
            : kind === "compliment"
              ? complimentMessage(context, random)
              : isZh(context.locale)
                ? `${context.buddyName} 在這裡。摸摸像素頭，繼續一起走。`
                : `${context.buddyName} is here. Pat the pixel head; we keep going together.`;

  return { message, kind, source, cta: null };
}

export function normalizeOSBuddyCompanionResponse(
  response: Partial<OSBuddyCompanionResponse> | null | undefined,
  fallback: OSBuddyCompanionResponse,
): OSBuddyCompanionResponse {
  const kind = OS_BUDDY_COMPANION_KINDS.includes(response?.kind as OSBuddyCompanionKind)
    ? (response?.kind as OSBuddyCompanionKind)
    : fallback.kind;
  const message = compactOSBuddyText(response?.message, 220) || fallback.message;
  const source =
    response?.source === "ai" || response?.source === "local" || response?.source === "fallback"
      ? response.source
      : fallback.source;

  const responseCta = response?.cta;
  const validGame =
    responseCta?.game === "pixel-catch" ||
    responseCta?.game === "focus-tap" ||
    responseCta?.game === "clean-desk";

  const cta = responseCta && validGame
    ? {
        label: compactOSBuddyText(responseCta.label, 40) || fallback.cta?.label || "Play",
        game: responseCta.game,
      }
    : fallback.cta ?? null;

  return { message, kind, source, cta };
}

export function isOSBuddyLocalOnlyKind(kind: OSBuddyCompanionKind): boolean {
  return kind === "quote" || kind === "weather" || kind === "game" || kind === "fallback";
}
