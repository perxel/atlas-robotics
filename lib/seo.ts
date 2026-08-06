import type { Metadata } from "next";
import { locales, defaultLocale, localePath, stripLocalePrefix, type Locale } from "@/lib/i18n";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Strips a leading /<locale> prefix, e.g. /en/blog/post -> /blog/post. No-op if unprefixed. */
export function stripLocale(pathname: string): string {
  return stripLocalePrefix(pathname);
}

export function buildAlternates(pathWithoutLocale: string, locale: Locale) {
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = `${siteUrl}${localePath(l, pathWithoutLocale)}`;
  }
  languages["x-default"] = `${siteUrl}${localePath(defaultLocale, pathWithoutLocale)}`;

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
