import { MultilingualService } from "@/cms/multilingual/MultilingualService";

/**
 * Locale registration, split out of lib/cms.ts on purpose so middleware.ts
 * can depend on this file alone. middleware.ts runs on every request as an
 * edge Worker with a hard bundle-size limit (Cloudflare); lib/cms.ts pulls
 * in the full generated Tina GraphQL client plus (transitively, via
 * lib/dashboards.ts and anything else built on top of it) admin-only
 * React/JSX code. A named import only prevents *using* the rest of a
 * module's exports — it doesn't stop a bundler from including a module's
 * other top-level side-effecting code (a `new Xyz(...)` a bundler can't
 * prove is side-effect-free is conservatively kept). The fix isn't
 * reshuffling what lives inside lib/cms.ts — it's giving middleware.ts an
 * import target that never has an edge to Tina/admin code in the first
 * place, so nothing added to lib/cms.ts later can ever bloat this bundle
 * again.
 *
 * MultilingualService is imported from its own file, not the
 * "@/cms/multilingual" barrel — confirmed live with an esbuild
 * tree-shaken bundle of middleware.ts that importing through the barrel
 * pulls in React and the barrel's other re-export
 * (dashboard/createTranslationDashboardScreen.tsx) anyway, even though
 * nothing here references it. A barrel is one module; a bundler won't drop
 * a sibling re-export just because this file's import list doesn't name it.
 *
 * lib/cms.ts re-exports everything here for every other consumer — this
 * file is not "the locale API," it's the one place middleware.ts is
 * allowed to import from.
 */

export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];

// The default locale is served unprefixed at "/" (e.g. "/products").
// Every other locale is served under its own prefix (e.g. "/vi/products").
export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

export const CMSMultilingual = new MultilingualService<Locale>({
  locales,
  defaultLocale,
  // Both locales are enabled today. Disable one by trimming this array —
  // its content stays fully intact and editable, it just stops showing up
  // in the sitemap, hreflang, the language switcher, and the Translation
  // Dashboard. See MultilingualService's own doc comment. Admin can only
  // ever reorder/relabel/add-flag among locales registered here (the
  // language switcher's `locale` field is a dropdown constrained to
  // `options: [...locales]`, see cms/multilingual/fields.ts) — it cannot
  // add a locale that isn't registered in this file.
  enabledLocales: locales,
});

// Call sites use CMSMultilingual.isLocale/pathnameHasLocalePrefix/
// stripLocalePrefix/localePath directly — no wrapper functions here.
