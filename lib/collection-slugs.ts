import { locales, localePath, type Locale } from "@/lib/i18n";

/**
 * Single source of truth for this app's collection-backed sections — `blog`
 * and `products`, each with their own listing/detail/taxonomy-archive
 * routes under app/[locale]/, as opposed to a single `pages` document like
 * About or Contact. Two things per collection, both code-level (not CMS
 * content) because they concern the physical route folder, not a document:
 *
 * - `locales`: the per-locale URL segment for this collection's routes
 *   (e.g. "blog" in English, "tin-tuc" in Vietnamese). A `pages` document
 *   gets a translated URL for free via its own per-locale `slug` field —
 *   these can't, because their segment is a literal folder name. Adding a
 *   locale's translation here needs a matching redirect+rewrite pair in
 *   next.config.ts (see its comment) so the translated segment actually
 *   resolves and the untranslated one redirects to it.
 *
 * - `listingPageFilename`: the `pages` collection document (matched by
 *   filename, same in every locale) that backs this collection's listing
 *   page — e.g. content/pages/en/blog.md + content/pages/vi/blog.md render
 *   at this collection's translated URL via a BlogListingBlock. Its `slug`
 *   field is locked (see lib/pages-config.ts's lockedSlugFilenames) because
 *   the collection's real public URL segment is owned by `locales` above,
 *   not by that document's slug — letting an editor "change" a slug that
 *   doesn't actually move anything would be actively misleading. Don't
 *   delete these documents; nothing currently enforces that (see CLAUDE.md).
 *
 * Adding a new collection with its own listing page is one entry here —
 * lib/pages-config.ts's locked-slug list derives from this registry rather
 * than duplicating the filenames by hand.
 */
export const collectionSlugs = {
  blog: {
    locales: { en: "blog", vi: "tin-tuc" },
    listingPageFilename: "blog",
  },
  products: {
    locales: { en: "products", vi: "san-pham" },
    listingPageFilename: "products",
  },
} as const satisfies Record<string, { locales: Record<Locale, string>; listingPageFilename: string }>;

export type CollectionKey = keyof typeof collectionSlugs;

/**
 * Canonical collection key for a raw path segment, in ANY locale's
 * spelling — exported for lib/locale-alternates.ts, which needs to tell
 * "this path belongs to a collection route" (blog/products; resolved by
 * string transform) apart from "this is a `pages` document's own slug"
 * (resolved by a real cross-locale document lookup instead).
 */
export function collectionForSegment(segment: string): CollectionKey | null {
  for (const key of Object.keys(collectionSlugs) as CollectionKey[]) {
    if ((locales as readonly Locale[]).some((l) => collectionSlugs[key].locales[l] === segment)) {
      return key;
    }
  }
  return null;
}

/**
 * Locale-prefixed URL for `collection`, optionally with a sub-path
 * appended, e.g. collectionPath("vi", "blog", "/my-post") ->
 * "/vi/tin-tuc/my-post". This should be the only place in the app that
 * spells out "/blog" or "/products" as a literal string — every link
 * builder should call this instead, the same way locale prefixing always
 * goes through localePath().
 */
export function collectionPath(locale: Locale, collection: CollectionKey, rest = ""): string {
  return localePath(locale, `/${collectionSlugs[collection].locales[locale]}${rest}`);
}

/**
 * Rewrites the leading collection segment of a locale-free path (e.g.
 * "/tin-tuc/my-post") to its equivalent for `locale` (e.g. "/blog/my-post"
 * for en) — used by buildAlternates (lib/seo.ts) so hreflang/canonical
 * links point at each locale's actual translated URL instead of naively
 * reusing the current locale's path verbatim. No-op if the path's first
 * segment isn't a known collection (e.g. a `pages` document's own slug —
 * those are resolved by getPageAlternates in lib/tina-content.ts instead).
 */
export function translateCollectionPath(pathWithoutLocale: string, locale: Locale): string {
  const match = pathWithoutLocale.match(/^\/([^/]+)(\/.*)?$/);
  if (!match) return pathWithoutLocale;
  const [, segment, rest] = match;
  const collection = collectionForSegment(segment);
  if (!collection) return pathWithoutLocale;
  return `/${collectionSlugs[collection].locales[locale]}${rest ?? ""}`;
}

/**
 * Resolves the real public URL for a `pages` document, given its filename
 * and its own `slug` field. Two kinds of `pages` document don't resolve to
 * `/<slug>` directly: `home` (resolves to the site root) and any
 * collection's locked listing page (resolves to that collection's
 * translated URL via `collectionPath`, not this document's `slug` field at
 * all — see lib/pages-config.ts's `lockedSlugFilenames`). Shared by the
 * `pages` collection's admin-preview `ui.router`
 * (tina/collections/pages.schema.tsx) and app/sitemap.ts, so this
 * resolution logic lives in one place instead of being duplicated.
 */
export function resolvePagesDocumentUrl(locale: Locale, filename: string, slug: string): string {
  if (filename === "home") return localePath(locale, "/");
  const collectionKey = (Object.keys(collectionSlugs) as CollectionKey[]).find(
    (key) => collectionSlugs[key].listingPageFilename === filename
  );
  if (collectionKey) return collectionPath(locale, collectionKey);
  return localePath(locale, `/${slug}`);
}
