import type { Metadata } from "next";
import { locales, defaultLocale, localePath, stripLocalePrefix, type Locale } from "@/lib/i18n";

// Every canonical URL, hreflang alternate, and sitemap entry in this app is
// built from this one value — silently falling back to localhost in
// production would poison all of them with no warning. Same "fail loud
// instead of silently wrong" reasoning as tina/config.ts's
// assertSlugFieldsHaveGuard, and the same category of footgun CLAUDE.md's
// "Production builds require Tina Cloud" note already documents for
// NEXT_PUBLIC_TINA_CLIENT_ID/TINA_TOKEN — set this wherever the app
// builds/runs, in both places on platforms that separate build-time and
// runtime env vars.
export const siteUrl = (() => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Canonical/hreflang/sitemap URLs would all " +
        "silently resolve to http://localhost:3000 in production otherwise — see " +
        "lib/seo.ts and CLAUDE.md's \"Production builds require Tina Cloud\" note."
    );
  }
  return "http://localhost:3000";
})();

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
  if (Object.keys(languages).length > 0) {
    // x-default must be the SAME target on every locale variant in this
    // page's cluster — search engines treat hreflang as a reciprocal set,
    // so the en page and the vi page both need to point x-default at one
    // agreed URL, not each other's own. Prefer defaultLocale's URL; only
    // fall through `locales` order if that locale's own alternate wasn't
    // resolved (e.g. a translation gap), so this is always deterministic
    // and never depends on which locale is currently rendering.
    const xDefaultLocale = [defaultLocale, ...locales].find((l) => alternates[l]);
    if (xDefaultLocale) {
      languages["x-default"] = `${siteUrl}${alternates[xDefaultLocale]}`;
    }
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
