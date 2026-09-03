export type DailyKnowledgeCandidate = {
  id: string;
  title: string;
  status: string | null;
};

type DailyKnowledgePickOptions = {
  userId: string;
  dayKey: string;
};

const DAY_MS = 86_400_000;

function stableStringHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function dayOrdinal(dayKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return stableStringHash(dayKey);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return stableStringHash(dayKey);
  }

  return Math.floor(timestamp / DAY_MS);
}

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getKnowledgePickDayKey(
  date: Date = new Date(),
  timeZone?: string | null,
): string {
  const requestedTimeZone = timeZone?.trim();
  if (!requestedTimeZone || requestedTimeZone.toLowerCase() === "auto") {
    return localDayKey(date);
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: requestedTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const year = values.get("year");
    const month = values.get("month");
    const day = values.get("day");
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Invalid or unsupported profile timezone: use the device-local day.
  }

  return localDayKey(date);
}

/**
 * Selects one stable item for a user's local calendar day.
 *
 * The input is copied and sorted before selection so query ordering cannot
 * change the result. A changed eligible pool can change that day's result;
 * persisting a strict cross-device assignment would require database state.
 */
export function selectDailyKnowledgePick<T extends DailyKnowledgeCandidate>(
  items: readonly T[],
  options: DailyKnowledgePickOptions,
): T | null {
  const eligible = items
    .filter((item) => item.status === "ready" && item.title.trim().length > 0)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));

  if (eligible.length === 0) return null;

  const offset = stableStringHash(options.userId) % eligible.length;
  const index = (dayOrdinal(options.dayKey) + offset) % eligible.length;
  return eligible[index] ?? null;
}
