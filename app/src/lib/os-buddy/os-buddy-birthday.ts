export type OSBuddyBirthdayProfile = {
  enabled: boolean;
  month: number | null;
  day: number | null;
  year?: number | null;
  showAge?: boolean;
  reminderEnabled?: boolean;
  timezone?: string | null;
  leapDayFallback?: "feb-28" | "mar-1";
  lastCelebratedOn?: string | null;
  lastReminderOn?: string | null;
};

export type OSBuddyBirthdayStatus =
  | {
      type: "not-set";
    }
  | {
      type: "today";
      age?: number;
    }
  | {
      type: "upcoming";
      daysUntil: number;
      age?: number;
    }
  | {
      type: "none";
      daysUntil: number;
    };

export const DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE: OSBuddyBirthdayProfile = {
  enabled: false,
  month: null,
  day: null,
  year: null,
  showAge: false,
  reminderEnabled: true,
  timezone: null,
  leapDayFallback: "feb-28",
  lastCelebratedOn: null,
  lastReminderOn: null,
};

export const OS_BUDDY_BIRTHDAY_STORAGE_KEY = "mblos:os-buddy-birthday";

const UPCOMING_BIRTHDAY_WINDOW_DAYS = 7;
const MIN_BIRTHDAY_YEAR = 1900;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type CalendarParts = {
  year: number;
  month: number;
  day: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function intOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonthForBirthdayValidation(month: number, year: number | null) {
  if (month === 2 && year == null) return 29;
  return new Date(year ?? 2000, month, 0).getDate();
}

function isValidBirthdayDate(month: number | null, day: number | null, year: number | null) {
  if (month == null || day == null) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  return day <= daysInMonthForBirthdayValidation(month, year);
}

function getCalendarParts(date: Date, timezone?: string | null): CalendarParts {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).formatToParts(date);
      const year = Number(parts.find((part) => part.type === "year")?.value);
      const month = Number(parts.find((part) => part.type === "month")?.value);
      const day = Number(parts.find((part) => part.type === "day")?.value);
      if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
        return { year, month, day };
      }
    } catch {
      // Fall back to the browser-local calendar when an old timezone value is invalid.
    }
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function calendarDayOrdinal(parts: CalendarParts) {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatCalendarDateKey(parts: CalendarParts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function effectiveBirthdayPartsForYear(
  profile: OSBuddyBirthdayProfile,
  year: number,
): CalendarParts | null {
  if (!isValidBirthdayDate(profile.month, profile.day, profile.year ?? null)) return null;

  if (profile.month === 2 && profile.day === 29 && !isLeapYear(year)) {
    return profile.leapDayFallback === "mar-1"
      ? { year, month: 3, day: 1 }
      : { year, month: 2, day: 28 };
  }

  return { year, month: profile.month!, day: profile.day! };
}

function getBirthdayTarget(params: {
  profile: OSBuddyBirthdayProfile;
  now?: Date;
}): { daysUntil: number; birthdayYear: number; dateKey: string } | null {
  const profile = validateOSBuddyBirthdayProfile(params.profile);
  if (!profile.enabled) return null;

  const now = params.now ?? new Date();
  const currentParts = getCalendarParts(now, profile.timezone);
  const currentOrdinal = calendarDayOrdinal(currentParts);
  const thisYearBirthday = effectiveBirthdayPartsForYear(profile, currentParts.year);
  if (!thisYearBirthday) return null;

  let targetParts = thisYearBirthday;
  let targetOrdinal = calendarDayOrdinal(targetParts);
  if (targetOrdinal < currentOrdinal) {
    const nextYearBirthday = effectiveBirthdayPartsForYear(profile, currentParts.year + 1);
    if (!nextYearBirthday) return null;
    targetParts = nextYearBirthday;
    targetOrdinal = calendarDayOrdinal(targetParts);
  }

  return {
    daysUntil: targetOrdinal - currentOrdinal,
    birthdayYear: targetParts.year,
    dateKey: formatCalendarDateKey(targetParts),
  };
}

function calculateAgeForBirthdayYear(profile: OSBuddyBirthdayProfile, birthdayYear: number) {
  if (profile.year == null) return null;
  const age = birthdayYear - profile.year;
  return age >= 0 ? age : null;
}

function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Birthday Mode must never break the app if storage is unavailable.
  }
}

export function validateOSBuddyBirthdayProfile(
  profile: Partial<OSBuddyBirthdayProfile>,
): OSBuddyBirthdayProfile {
  if (!isRecord(profile)) return { ...DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE };

  const month = intOrNull(profile.month);
  const day = intOrNull(profile.day);
  const rawYear = intOrNull(profile.year);
  const currentYear = new Date().getFullYear();
  const year =
    rawYear != null && rawYear >= MIN_BIRTHDAY_YEAR && rawYear <= currentYear ? rawYear : null;
  const hasBirthday = isValidBirthdayDate(month, day, year);

  if ((month != null || day != null) && !hasBirthday) {
    return { ...DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE };
  }

  const timezone =
    typeof profile.timezone === "string" && profile.timezone.trim()
      ? profile.timezone.trim()
      : null;

  return {
    enabled: Boolean(profile.enabled) && hasBirthday,
    month: hasBirthday ? month : null,
    day: hasBirthday ? day : null,
    year,
    showAge: Boolean(profile.showAge) && year != null,
    reminderEnabled:
      typeof profile.reminderEnabled === "boolean" ? profile.reminderEnabled : true,
    timezone,
    leapDayFallback: profile.leapDayFallback === "mar-1" ? "mar-1" : "feb-28",
    lastCelebratedOn:
      typeof profile.lastCelebratedOn === "string" ? profile.lastCelebratedOn : null,
    lastReminderOn: typeof profile.lastReminderOn === "string" ? profile.lastReminderOn : null,
  };
}

export function getLocalOSBuddyBirthdayProfile(): OSBuddyBirthdayProfile {
  const raw = readStorageJson<Partial<OSBuddyBirthdayProfile> | null>(
    OS_BUDDY_BIRTHDAY_STORAGE_KEY,
    null,
  );
  if (!raw) return { ...DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE };
  const profile = validateOSBuddyBirthdayProfile(raw);
  if (JSON.stringify(profile) !== JSON.stringify(raw)) {
    saveLocalOSBuddyBirthdayProfile(profile);
  }
  return profile;
}

export function saveLocalOSBuddyBirthdayProfile(profile: OSBuddyBirthdayProfile): void {
  writeStorageJson(OS_BUDDY_BIRTHDAY_STORAGE_KEY, validateOSBuddyBirthdayProfile(profile));
}

export function getOSBuddyBirthdayStatus(params: {
  profile: OSBuddyBirthdayProfile;
  now?: Date;
}): OSBuddyBirthdayStatus {
  const profile = validateOSBuddyBirthdayProfile(params.profile);
  if (!profile.enabled) return { type: "not-set" };

  const target = getBirthdayTarget({ profile, now: params.now });
  if (!target) return { type: "not-set" };

  const age = profile.showAge ? calculateAgeForBirthdayYear(profile, target.birthdayYear) : null;
  const agePayload = age == null ? {} : { age };

  if (target.daysUntil === 0) {
    return {
      type: "today",
      ...agePayload,
    };
  }

  if (target.daysUntil <= UPCOMING_BIRTHDAY_WINDOW_DAYS) {
    return {
      type: "upcoming",
      daysUntil: target.daysUntil,
      ...agePayload,
    };
  }

  return {
    type: "none",
    daysUntil: target.daysUntil,
  };
}

export function isOSBuddyBirthdayToday(params: {
  profile: OSBuddyBirthdayProfile;
  now?: Date;
}): boolean {
  return getOSBuddyBirthdayStatus(params).type === "today";
}

export function getDaysUntilOSBuddyBirthday(params: {
  profile: OSBuddyBirthdayProfile;
  now?: Date;
}): number | null {
  const target = getBirthdayTarget({
    profile: validateOSBuddyBirthdayProfile(params.profile),
    now: params.now,
  });
  return target?.daysUntil ?? null;
}

export function getOSBuddyBirthdayAge(params: {
  profile: OSBuddyBirthdayProfile;
  now?: Date;
}): number | null {
  const profile = validateOSBuddyBirthdayProfile(params.profile);
  const target = getBirthdayTarget({ profile, now: params.now });
  return target ? calculateAgeForBirthdayYear(profile, target.birthdayYear) : null;
}

export function getOSBuddyBirthdayTodayKey(params: {
  profile?: OSBuddyBirthdayProfile;
  now?: Date;
} = {}): string {
  const profile = params.profile
    ? validateOSBuddyBirthdayProfile(params.profile)
    : DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE;
  return formatCalendarDateKey(getCalendarParts(params.now ?? new Date(), profile.timezone));
}

export function getOSBuddyBirthdayTargetKey(params: {
  profile: OSBuddyBirthdayProfile;
  now?: Date;
}): string | null {
  return getBirthdayTarget({
    profile: validateOSBuddyBirthdayProfile(params.profile),
    now: params.now,
  })?.dateKey ?? null;
}

export function getOSBuddyBirthdayProfileFromSource(
  source: unknown,
): OSBuddyBirthdayProfile | null {
  if (!isRecord(source)) return null;
  const month = source.os_buddy_birthday_month;
  const day = source.os_buddy_birthday_day;
  if (month == null && day == null) return null;

  return validateOSBuddyBirthdayProfile({
    enabled: source.os_buddy_birthday_enabled as boolean | undefined,
    month: month as number | null,
    day: day as number | null,
    year: source.os_buddy_birthday_year as number | null,
    showAge: source.os_buddy_birthday_show_age as boolean | undefined,
    reminderEnabled: source.os_buddy_birthday_reminder_enabled as boolean | undefined,
    timezone: source.os_buddy_birthday_timezone as string | null,
    lastCelebratedOn: source.os_buddy_birthday_last_celebrated_on as string | null,
    lastReminderOn: source.os_buddy_birthday_last_reminder_on as string | null,
  });
}

export function toOSBuddyBirthdayProfileUpdate(profile: OSBuddyBirthdayProfile) {
  const value = validateOSBuddyBirthdayProfile(profile);
  return {
    os_buddy_birthday_enabled: value.enabled,
    os_buddy_birthday_month: value.month,
    os_buddy_birthday_day: value.day,
    os_buddy_birthday_year: value.year ?? null,
    os_buddy_birthday_show_age: Boolean(value.showAge),
    os_buddy_birthday_reminder_enabled: value.reminderEnabled !== false,
    os_buddy_birthday_timezone: value.timezone ?? null,
    os_buddy_birthday_last_celebrated_on: value.lastCelebratedOn ?? null,
    os_buddy_birthday_last_reminder_on: value.lastReminderOn ?? null,
  };
}
