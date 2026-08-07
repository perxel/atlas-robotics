import type { Metadata } from "next";
import { locales, defaultLocale, localePath, stripLocalePrefix, type Locale } from "@/lib/i18n";
import { translateSectionPath } from "@/lib/section-slugs";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Strips a leading /<locale> prefix, e.g. /en/blog/post -> /blog/post. No-op if unprefixed. */
export function stripLocale(pathname: string): string {
  return stripLocalePrefix(pathname);
}

export function buildAlternates(pathWithoutLocale: string, locale: Locale) {
  // `pathWithoutLocale` is the current locale's own path, which may start
  // with a translated section segment (e.g. "/tin-tuc" for vi's blog) —
  // translateSectionPath maps that leading segment to each other locale's
  // equivalent before it's prefixed, so hreflang/x-default point at the
  // real translated URL instead of e.g. "/vi/blog" (a path that redirects,
  // not the canonical one). No-op for paths that aren't a known section,
  // e.g. a `pages` document's own per-locale slug.
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = `${siteUrl}${localePath(l, translateSectionPath(pathWithoutLocale, l))}`;
  }
  languages["x-default"] = `${siteUrl}${localePath(
    defaultLocale,
    translateSectionPath(pathWithoutLocale, defaultLocale)
  )}`;

  return {
    canonical: `${siteUrl}${localePath(locale, pathWithoutLocale)}`,
    languages,
  };
}

export type SeoFields = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
} | null | undefined;

export function buildMetadata(options: {
  locale: Locale;
  pathWithoutLocale: string;
  seo?: SeoFields;
  fallbackTitle: string;
  fallbackDescription?: string | null;
  fallbackOgImage?: string | null;
}): Metadata {
  const { locale, pathWithoutLocale, seo, fallbackTitle, fallbackDescription, fallbackOgImage } =
    options;

  const title = seo?.metaTitle || fallbackTitle;
  const description = seo?.metaDescription || fallbackDescription || undefined;
  const ogImage = seo?.ogImage || fallbackOgImage || undefined;

  return {
    title,
    description,
    alternates: buildAlternates(pathWithoutLocale, locale),
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      locale,
    },
  };
}
