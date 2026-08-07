import type { Metadata } from "next";
import { locales, localePath, stripLocalePrefix, type Locale } from "@/lib/i18n";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  const languages: Record<string, string> = {};
  for (const l of locales) {
    if (alternates[l]) languages[l] = `${siteUrl}${alternates[l]}`;
  }
  const defaultUrl = alternates[locale] ? alternates[locale] : localePath(locale, pathWithoutLocale);
  if (Object.keys(languages).length > 0) {
    // x-default points at whichever locale's URL is available, preferring
    // the current one — there's no meaningful "default" once alternates
    // genuinely diverge, so this just needs to be *a* valid URL.
    languages["x-default"] = `${siteUrl}${defaultUrl}`;
  }

  return {
    canonical: `${siteUrl}${localePath(locale, pathWithoutLocale)}`,
    languages,
  };
}

export type SeoFields = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  ogImageAlt?: string | null;
} | null | undefined;

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
  const {
    locale,
    pathWithoutLocale,
    alternates = {},
    seo,
    fallbackTitle,
    fallbackDescription,
    fallbackOgImage,
  } = options;

  const title = seo?.metaTitle || fallbackTitle;
  const description = seo?.metaDescription || fallbackDescription || undefined;
  const ogImage = seo?.ogImage || fallbackOgImage || undefined;
  const ogImageAlt = seo?.ogImage ? seo?.ogImageAlt || undefined : undefined;

  return {
    title,
    description,
    alternates: buildAlternates(pathWithoutLocale, locale, alternates),
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage, alt: ogImageAlt }] : undefined,
      locale,
    },
  };
}
