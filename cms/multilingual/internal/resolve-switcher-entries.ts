import type { SwitcherConfigItem, SwitcherEntry } from "../types";

/**
 * Merges CMS config overrides (display order / label / flag) with locale
 * defaults, de-dupes, drops disabled locales, then filters to only locales
 * this content is actually available in (the current locale always shows;
 * every other locale needs a real entry in `urls` — a locale with no
 * resolved URL has nothing to link to).
 */
export function resolveSwitcherEntries<TLocale extends string>(args: {
  currentLocale: TLocale;
  urls: Partial<Record<TLocale, string>>;
  labels?: Record<TLocale, string>;
  config?: SwitcherConfigItem[] | null;
  enabledLocales: readonly TLocale[];
  isLocale: (value: string) => value is TLocale;
  localePath: (locale: TLocale, pathWithoutLocale: string) => string;
}): SwitcherEntry<TLocale>[] {
  const seen = new Set<TLocale>();
  const merged: { locale: TLocale; label: string; flag?: string | null }[] = [];

  for (const item of args.config ?? []) {
    if (!item?.locale || !args.isLocale(item.locale) || seen.has(item.locale)) continue;
    if (!args.enabledLocales.includes(item.locale)) continue;
    seen.add(item.locale);
    merged.push({
      locale: item.locale,
      label: item.label || args.labels?.[item.locale] || item.locale,
      flag: item.flag,
    });
  }
  for (const locale of args.enabledLocales) {
    if (seen.has(locale)) continue;
    merged.push({ locale, label: args.labels?.[locale] || locale });
  }

  return merged
    .filter(({ locale }) => locale === args.currentLocale || args.urls[locale])
    .map((entry) => ({
      ...entry,
      href: args.urls[entry.locale] ?? args.localePath(entry.locale, "/"),
      isCurrent: entry.locale === args.currentLocale,
    }));
}
