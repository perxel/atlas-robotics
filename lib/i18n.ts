// Single source of truth for locale routing. To reuse this boilerplate on a
// new project: list every locale here and set which one is the default —
// nothing else in the app hardcodes locale strings.
export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];

// The default locale is served unprefixed at "/" (e.g. "/products").
// Every other locale is served under its own prefix (e.g. "/vi/products").
export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** True if `pathname` starts with an explicit /<locale> prefix. */
export function pathnameHasLocalePrefix(pathname: string): boolean {
  return locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
}

/** Strips a leading /<locale> segment off a pathname, if present. */
export function stripLocalePrefix(pathname: string): string {
  for (const l of locales) {
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(`/${l}`.length);
  }
  return pathname;
}

/**
 * Builds the URL path for `locale` given a locale-free path (e.g. "/catalog").
 * The default locale is left unprefixed; others get a "/<locale>" prefix.
 */
export function localePath(locale: Locale, pathWithoutLocale: string): string {
  const clean = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
  return locale === defaultLocale ? clean || "/" : `/${locale}${clean}`;
}
