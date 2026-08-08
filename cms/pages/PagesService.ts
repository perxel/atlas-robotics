import { inLocale } from "@/cms/collection";
import type { PagesDeps, PagesDoc, PagesInjected } from "./types";

/**
 * The generic `pages`-collection concern: resolve a document by slug, and
 * two flavors of cross-locale alternates — this document's own translated
 * `slug` (getAlternates), versus a collection's real listing-page URL,
 * which is owned by the collection registry, not this document's slug
 * field (getListingAlternates). See CLAUDE.md's "Collection-backed
 * listing pages" section for why those two differ.
 */
export class PagesService<TLocale extends string> {
  #deps: PagesDeps;
  #injected: PagesInjected<TLocale>;
  #locales: readonly TLocale[];
  #defaultLocale: TLocale;

  constructor(
    deps: PagesDeps,
    injected: PagesInjected<TLocale>,
    options: { locales: readonly TLocale[]; defaultLocale: TLocale }
  ) {
    this.#deps = deps;
    this.#injected = injected;
    this.#locales = options.locales;
    this.#defaultLocale = options.defaultLocale;
  }

  #filenameOf(doc: PagesDoc): string {
    return doc._sys.relativePath.split("/").pop()?.replace(/\.md$/, "") ?? doc._sys.relativePath;
  }

  /** Resolves by slug (two-step: a filtered connection query to find the
   * matching document's relativePath, then a single-doc fetch — see
   * CLAUDE.md's "Routable slugs" section for why lookups never assume
   * filename === slug). Returns `null` on any failure, same as
   * CollectionService.getCollectionItem — a page's job is to 404, not crash. */
  async getBySlug<T>(args: { lang?: TLocale; slug: string }): Promise<T | null> {
    const locale = args.lang ?? this.#defaultLocale;
    try {
      const edges = await this.#deps.fetchConnection({ slug: args.slug });
      const match = inLocale(edges, locale)[0];
      if (!match) return null;
      return (await this.#deps.fetchByPath(match._sys.relativePath)) as T;
    } catch {
      return null;
    }
  }

  /** Cross-locale sibling lookup keyed by filename — see CLAUDE.md's
   * "Cross-locale linking is by filename, not by slug" section: two locale
   * documents are "the same page" purely because they share a filename,
   * and each returns its own real URL built from its own `slug` field.
   * `"home"` is the one hardcoded exception, since that document is always
   * resolved at the site root rather than by its slug — matches the same
   * special case on the routing side (CollectionService.resolvePagesDocumentUrl). */
  async getAlternates(filename: string): Promise<Partial<Record<TLocale, string>>> {
    try {
      const edges = await this.#deps.fetchConnection();
      const result: Partial<Record<TLocale, string>> = {};
      for (const locale of this.#locales) {
        const doc = inLocale(edges, locale).find((d) => this.#filenameOf(d) === filename);
        if (doc) {
          result[locale] =
            doc.slug === "home"
              ? this.#injected.localePath(locale, "/")
              : this.#injected.localePath(locale, `/${doc.slug}`);
        }
      }
      return result;
    } catch {
      return {};
    }
  }

  /** Cross-locale existence check for a collection's listing page — same
   * filename-matched lookup as getAlternates, but the URL comes from the
   * collection registry (`getCollectionPath`), never from this document's
   * own `slug` field, since that field doesn't drive the listing page's
   * real URL (see CLAUDE.md's "Collection-backed listing pages" section). */
  async getListingAlternates(args: {
    collectionName: string;
    filename: string;
  }): Promise<Partial<Record<TLocale, string>>> {
    try {
      const edges = await this.#deps.fetchConnection();
      const result: Partial<Record<TLocale, string>> = {};
      for (const locale of this.#locales) {
        const doc = inLocale(edges, locale).find((d) => this.#filenameOf(d) === args.filename);
        if (doc) {
          result[locale] = this.#injected.getCollectionPath({ collectionName: args.collectionName, lang: locale });
        }
      }
      return result;
    } catch {
      return {};
    }
  }

  /** Per-document SEO index for the SEO dashboard — same shape and same
   * "read `.seo`/`.slug` off already-fetched connection edges" approach as
   * CollectionService.getSeoIndex, kept as a separate method (rather than
   * shared code) because `pages` isn't a CollectionService registry entry:
   * its root-URL, individually-slugged shape doesn't fit that registry's
   * one-fixed-prefix-per-collection assumption (see CLAUDE.md's
   * "Pages collection & block-based editing" section). */
  async getSeoIndex(): Promise<{ filename: string; locale: TLocale; slug: string; seo: unknown }[]> {
    const edges = await this.#deps.fetchConnection();
    return (edges || [])
      .map(
        (edge) =>
          edge?.node as
            | { slug?: string; seo?: unknown; _sys?: { relativePath: string; breadcrumbs: string[] } }
            | undefined
      )
      .filter((node): node is NonNullable<typeof node> & { _sys: { relativePath: string; breadcrumbs: string[] } } =>
        !!node?._sys
      )
      .map((node) => ({
        filename: node._sys.relativePath.split("/").pop()?.replace(/\.md$/, "") ?? node._sys.relativePath,
        locale: node._sys.breadcrumbs[0] as TLocale,
        slug: node.slug ?? "",
        seo: node.seo,
      }));
  }
}
