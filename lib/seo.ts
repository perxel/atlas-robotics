import type { Metadata } from "next";
import { stripLocalePrefix, type Locale } from "@/lib/i18n";
import { CMSSeo, siteUrl } from "@/lib/cms";
import type { SeoFields } from "@/cms/seo";

// --- Thin project-level facades over CMSSeo, preserving the exact call
// shape the pre-refactor lib/seo.ts used to export, so existing call sites
// only needed their import path updated (most needed none at all — this
// file kept its own name). `siteUrl` lives in lib/cms.ts now (see that
// file's comment on why: this file importing CMSSeo from there would
// otherwise be circular), re-exported here unchanged. ---

export { siteUrl };
export type { SeoFields };

/** Strips a leading /<locale> prefix, e.g. /en/blog/post -> /blog/post. No-op if unprefixed. */
export function stripLocale(pathname: string): string {
  return stripLocalePrefix(pathname);
}

/**
 * `alternates` is a locale -> locale-prefixed-path map for the CURRENT
 * page's equivalent in each locale, from lib/locale-alternates.ts's
 * `resolveLocaleAlternates` — the single place that knows how to resolve
 * that (collection routes via string transform, `pages` documents via a
 * real cross-locale lookup, since their slugs can genuinely diverge).
 * A locale missing from the map just doesn't get an hreflang entry,
 * rather than guessing at a URL that might not exist.
 */
export function buildAlternates(
  pathWithoutLocale: string,
  locale: Locale,
  alternates: Partial<Record<Locale, string>>
) {
  return CMSSeo.buildAlternates({ pathWithoutLocale, lang: locale, alternates });
}

export function buildMetadata(options: {
  locale: Locale;
  pathWithoutLocale: string;
  /** From resolveLocaleAlternates (lib/locale-alternates.ts). Omit only for
   * generic/fallback metadata (e.g. the root layout) that isn't about one
   * specific resolvable page. */
  alternates?: Partial<Record<Locale, string>>;
  seo?: SeoFields;
  fallbackTitle: string;
  fallbackDescription?: string | null;
  fallbackOgImage?: string | null;
}): Metadata {
  const { locale, ...rest } = options;
  return CMSSeo.buildMetadata({ lang: locale, ...rest });
}
