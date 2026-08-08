// Single source of truth for locale routing. To reuse this boilerplate on a
// new project: list every locale here and set which one is the default —
// nothing else in the app hardcodes locale strings.
import { MultilingualService } from "@/cms/multilingual";

export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];

// The default locale is served unprefixed at "/" (e.g. "/products").
// Every other locale is served under its own prefix (e.g. "/vi/products").
export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

// Instantiated here (not lib/cms.ts) deliberately: lib/cms.ts pulls in
// tina/__generated__/client for CMSCollection/CMSTaxonomy, and middleware.ts
// (edge runtime) needs the routing/enable-disable logic without dragging
// that whole GraphQL-client import graph along. MultilingualService itself
// has no such dependency — locale routing is pure array/string logic — so
// it's safe and lightweight to construct right where `locales`/`defaultLocale`
// are already defined.
export const CMSMultilingual = new MultilingualService<Locale>({
  locales,
  defaultLocale,
  // Both locales are enabled today. Disable one by trimming this array —
  // its content stays fully intact and editable, it just stops showing up
  // in the sitemap, hreflang, the language switcher, and the Translation
  // Dashboard. See MultilingualService's own doc comment.
  enabledLocales: locales,
});

export function isLocale(value: string): value is Locale {
  return CMSMultilingual.isLocale(value);
}

/** True if `pathname` starts with an explicit /<locale> prefix. */
export function pathnameHasLocalePrefix(pathname: string): boolean {
  return CMSMultilingual.pathnameHasLocalePrefix(pathname);
}

/** Strips a leading /<locale> segment off a pathname, if present. */
export function stripLocalePrefix(pathname: string): string {
  return CMSMultilingual.stripLocalePrefix(pathname);
}

/**
 * Builds the URL path for `locale` given a locale-free path (e.g. "/catalog").
 * The default locale is left unprefixed; others get a "/<locale>" prefix.
 */
export function localePath(locale: Locale, pathWithoutLocale: string): string {
  return CMSMultilingual.localePath(locale, pathWithoutLocale);
}
