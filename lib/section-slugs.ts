import { locales, localePath, type Locale } from "@/lib/i18n";

/**
 * Per-locale path segments for this app's hardcoded top-level sections —
 * dedicated route folders under app/[locale]/ (blog, products, contact),
 * not `pages` documents. A `pages` document already gets a translated URL
 * for free via its own per-locale `slug` field (e.g. content/pages/vi/about.md
 * can set slug: "ve-chung-toi" directly — no code involved). These three
 * can't do that because their URL segment is a literal folder name, not
 * CMS content, so the translation has to live here instead.
 *
 * Adding a locale's translation here needs a matching redirect+rewrite
 * pair in next.config.ts (see its comment) so the translated segment
 * actually resolves and the untranslated one redirects to it.
 */
export const sectionSlugs = {
  blog: { en: "blog", vi: "tin-tuc" },
  products: { en: "products", vi: "san-pham" },
  contact: { en: "contact", vi: "lien-he" },
} as const satisfies Record<string, Record<Locale, string>>;

export type Section = keyof typeof sectionSlugs;

/** Canonical section key for a raw path segment, in ANY locale's spelling. */
function sectionForSegment(segment: string): Section | null {
  for (const key of Object.keys(sectionSlugs) as Section[]) {
    if ((locales as readonly Locale[]).some((l) => sectionSlugs[key][l] === segment)) return key;
  }
  return null;
}

/**
 * Locale-prefixed URL for `section`, optionally with a sub-path appended,
 * e.g. sectionPath("vi", "blog", "/my-post") -> "/vi/tin-tuc/my-post".
 * This should be the only place in the app that spells out "/blog" or
 * "/products" as a literal string — every link builder should call this
 * instead, the same way locale prefixing always goes through localePath().
 */
export function sectionPath(locale: Locale, section: Section, rest = ""): string {
  return localePath(locale, `/${sectionSlugs[section][locale]}${rest}`);
}

/**
 * Rewrites the leading section segment of a locale-free path (e.g.
 * "/tin-tuc/my-post") to its equivalent for `locale` (e.g. "/blog/my-post"
 * for en) — used by buildAlternates (lib/seo.ts) so hreflang/canonical
 * links point at each locale's actual translated URL instead of naively
 * reusing the current locale's path verbatim. No-op if the path's first
 * segment isn't a known section (e.g. a `pages` document's own slug).
 */
export function translateSectionPath(pathWithoutLocale: string, locale: Locale): string {
  const match = pathWithoutLocale.match(/^\/([^/]+)(\/.*)?$/);
  if (!match) return pathWithoutLocale;
  const [, segment, rest] = match;
  const section = sectionForSegment(segment);
  if (!section) return pathWithoutLocale;
  return `/${sectionSlugs[section][locale]}${rest ?? ""}`;
}
