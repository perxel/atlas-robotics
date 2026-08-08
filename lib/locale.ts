// Imported from its own file, not the "@/cms/multilingual" barrel — a
// barrel pulls in its other exports (JSX) into any bundle that imports it.
import { MultilingualService } from "@/cms/multilingual/MultilingualService";

// Locale registration, split out of lib/cms.ts so middleware.ts (an edge
// Worker with a hard bundle-size limit) can depend on this file alone,
// never on lib/cms.ts's generated-Tina-client/admin-JSX graph. See
// .claude/docs/00-overview.md for the full reasoning (esbuild-verified).
// lib/cms.ts re-exports everything here for every other consumer.

export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];

// Default locale is served unprefixed at "/"; others under "/<locale>".
export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

// Disable a locale by trimming enabledLocales — its content stays intact,
// it just stops appearing in the sitemap/hreflang/switcher/dashboard.
export const CMSMultilingual = new MultilingualService<Locale>({
  locales,
  defaultLocale,
  enabledLocales: locales,
});
