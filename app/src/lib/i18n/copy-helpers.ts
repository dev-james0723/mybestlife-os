import { APP_LOCALES, DEFAULT_LOCALE, type AppLocale } from "./app-locale";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type DeepPartial<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends readonly (infer U)[]
    ? DeepPartial<U>[]
    : T extends Primitive
      ? T
      : { [K in keyof T]?: DeepPartial<T[K]> };

/**
 * Missing locale strings fall back to the English `base` value (no runtime
 * TODO-locale-prefix markers). Add explicit entries in locale override maps to localize.
 */
function mergeCopy<T>(base: T, override: DeepPartial<T> | undefined, _locale: AppLocale): T {
  if (typeof base === "function") {
    if (typeof override === "function") return override as T;
    return ((...args: unknown[]) => {
      const result = (base as (...fnArgs: unknown[]) => unknown)(...args);
      return result;
    }) as T;
  }

  if (Array.isArray(base)) {
    type Elem = T extends readonly (infer U)[] ? U : never;
    const baseArr = base as readonly Elem[];
    if (Array.isArray(override)) {
      const overrideArr = override as DeepPartial<Elem>[];
      return overrideArr.map((item, index) =>
        mergeCopy((baseArr[index] ?? item) as Elem, item as DeepPartial<Elem>, _locale),
      ) as T;
    }
    return baseArr.map((item) => mergeCopy(item, undefined, _locale)) as T;
  }

  if (base && typeof base === "object") {
    const baseRecord = base as Record<string, unknown>;
    const overrideRecord =
      override && typeof override === "object" && !Array.isArray(override)
        ? (override as Record<string, unknown>)
        : {};

    const merged: Record<string, unknown> = {};
    for (const key of Object.keys(baseRecord)) {
      merged[key] = mergeCopy(baseRecord[key], overrideRecord[key] as never, _locale);
    }
    for (const key of Object.keys(overrideRecord)) {
      if (!(key in merged)) merged[key] = overrideRecord[key];
    }
    return merged as T;
  }

  if (override !== undefined) return override as T;
  if (typeof base === "string") return base as T;
  return base;
}

/**
 * Builds a full locale copy map from an English source object and per-locale
 * overrides. Keys omitted in an override fall back to English.
 */
export function createLocaleCopyMap<T>(
  english: T,
  overrides: Partial<Record<AppLocale, DeepPartial<T>>>,
): Record<AppLocale, T> {
  const localized = {} as Record<AppLocale, T>;

  for (const locale of APP_LOCALES) {
    if (locale === DEFAULT_LOCALE) {
      localized[locale] = english;
      continue;
    }
    localized[locale] = mergeCopy(english, overrides[locale], locale as AppLocale);
  }

  return localized;
}
