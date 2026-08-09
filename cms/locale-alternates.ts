export type LocaleAlternatesDeps<
  TCollectionName extends string,
  TTaxonomyName extends string,
  TLocale extends string,
> = {
  stripLocalePrefix: (pathname: string) => string;
  localePath: (locale: TLocale, pathWithoutLocale: string) => string;
  getCollectionForSegment: (segment: string) => TCollectionName | null;
  getCollectionPath: (args: { collectionName: TCollectionName; lang?: TLocale; rest?: string }) => string;
  translateCollectionPath: (pathWithoutLocale: string, lang: TLocale) => string;
  getCollectionAlternates: (args: {
    collectionName: TCollectionName;
    lang?: TLocale;
    slug: string;
  }) => Promise<Partial<Record<TLocale, string>>>;
  getListingPageFilename: (collectionName: TCollectionName) => string;
  resolveTaxonomyUrlSegment: (args: {
    collectionName: TCollectionName;
    lang?: TLocale;
    urlSegment: string;
  }) => TTaxonomyName | null;
  getTermAlternates: (args: {
    taxonomyName: TTaxonomyName;
    lang?: TLocale;
    termSlug: string;
  }) => Promise<Partial<Record<TLocale, string>>>;
  getTaxonomyUrlSegment: (args: {
    collectionName: TCollectionName;
    taxonomyName: TTaxonomyName;
    lang?: TLocale;
  }) => string | null;
  /** Resolves a `pages` document's filename by slug — a single bound
   * function (rather than exposing the raw query result) so this class
   * never has to know the GraphQL response shape, only "slug in, filename
   * out". */
  getPageFilenameBySlug: (args: { lang?: TLocale; slug: string }) => Promise<string | null>;
  getPageAlternates: (filename: string) => Promise<Partial<Record<TLocale, string>>>;
  getListingAlternates: (args: {
    collectionName: TCollectionName;
    filename: string;
  }) => Promise<Partial<Record<TLocale, string>>>;
};

/**
 * Given the current locale and a locale-free pathname, resolves the
 * correct URL for every locale that has one — the single source of truth
 * for "what's the equivalent of this page in another locale", used by both
 * hreflang/canonical and a language switcher. Depends on
 * CollectionService/TaxonomyService/MultilingualService/PagesService via
 * "Option A" injection (bound functions, not whole instances) — same
 * pattern TaxonomyService uses for its CollectionService dependency.
 *
 * Four cases, checked in order:
 *
 * - **A taxonomy archive route** (a registered collection + a registered
 *   taxonomy urlSegment + a term slug): the term slug is its own
 *   document's `slug` field, which can diverge per locale the same way a
 *   `pages` document's can, so it gets a real cross-locale lookup
 *   (`getTermAlternates`) — see `#resolveTaxonomyArchiveAlternates` below.
 *   Checked before the plain collection-route case since its path shape is
 *   a superset of it.
 * - **A collection's listing page** (e.g. "/blog" itself): a real
 *   existence check (`getListingAlternates`) against the locked `pages`
 *   document named by `getListingPageFilename()` — but the resulting URL
 *   is built from `getCollectionPath()`, not that document's own `slug`
 *   field, since a locked listing document's `slug` never drives its real
 *   public URL. A locale that hasn't had its listing page created yet is
 *   correctly reported as missing, not guessed.
 * - **A collection detail page** (an individual item, e.g. "/blog/my-post"):
 *   resolved with `getCollectionAlternates()`, a real cross-locale document
 *   lookup — NOT the pure string transform below. An untranslated item has
 *   no sibling document in that locale, so it's correctly omitted rather
 *   than assumed to exist under the same slug.
 * - **A taxonomy archive page's own listing shell**, or anything else
 *   under a collection route that isn't a detail page: falls back to the
 *   pure string transform (`translateCollectionPath()`), since only the
 *   collection's leading segment differs there.
 * - **Everything else**: treated as a `pages` document's own slug, which
 *   CAN genuinely diverge per locale, with nothing pairing them but a
 *   matching filename — resolved with a real cross-locale document lookup
 *   (`getPageAlternates`) instead of a guess.
 */
export class LocaleAlternatesService<
  TCollectionName extends string,
  TTaxonomyName extends string,
  TLocale extends string,
> {
  #deps: LocaleAlternatesDeps<TCollectionName, TTaxonomyName, TLocale>;
  #locales: readonly TLocale[];

  constructor(
    deps: LocaleAlternatesDeps<TCollectionName, TTaxonomyName, TLocale>,
    options: { locales: readonly TLocale[] }
  ) {
    this.#deps = deps;
    this.#locales = options.locales;
  }

  async resolve(locale: TLocale, pathname: string): Promise<Partial<Record<TLocale, string>>> {
    const path = this.#deps.stripLocalePrefix(pathname);

    if (path === "/") {
      // Home is a `pages` document with the well-known filename "home" — no
      // slug lookup needed to find it.
      return this.#deps.getPageAlternates("home");
    }

    const firstSegment = path.split("/")[1];
    const collectionKey = this.#deps.getCollectionForSegment(firstSegment);
    if (collectionKey) {
      const taxonomyAlternates = await this.#resolveTaxonomyArchiveAlternates(collectionKey, locale, path);
      if (taxonomyAlternates) return taxonomyAlternates;

      const rest = path.slice(`/${firstSegment}`.length); // "" (or "/") for the listing page itself
      if (!rest || rest === "/") {
        return this.#deps.getListingAlternates({
          collectionName: collectionKey,
          filename: this.#deps.getListingPageFilename(collectionKey),
        });
      }

      const detailSlug = rest.split("/")[1];
      if (detailSlug) {
        return this.#deps.getCollectionAlternates({ collectionName: collectionKey, lang: locale, slug: detailSlug });
      }

      const result: Partial<Record<TLocale, string>> = {};
      for (const l of this.#locales) {
        result[l] = this.#deps.localePath(l, this.#deps.translateCollectionPath(path, l));
      }
      return result;
    }

    const slug = path.slice(1);
    const filename = await this.#deps.getPageFilenameBySlug({ lang: locale, slug });
    if (!filename) return {};

    return this.#deps.getPageAlternates(filename);
  }

  /** `path` is locale-free, e.g. "/blog/category/news" or, paginated,
   * "/blog/category/news/page/2". Returns `null` (not `{}`) when `path`
   * isn't a taxonomy archive route at all, so the caller falls through to
   * the plain collection-route transform instead of treating "no term
   * matched" as "no alternates exist". */
  async #resolveTaxonomyArchiveAlternates(
    collectionKey: TCollectionName,
    locale: TLocale,
    path: string
  ): Promise<Partial<Record<TLocale, string>> | null> {
    const [, , taxonomySegment, termSlug, ...rest] = path.split("/");
    if (!taxonomySegment || !termSlug) return null;

    const taxonomyName = this.#deps.resolveTaxonomyUrlSegment({
      collectionName: collectionKey,
      lang: locale,
      urlSegment: taxonomySegment,
    });
    if (!taxonomyName) return null;

    const termAlternates = await this.#deps.getTermAlternates({ taxonomyName, lang: locale, termSlug });
    if (Object.keys(termAlternates).length === 0) return null;

    // Both the term's own slug AND the taxonomy's urlSegment can differ per
    // locale, so both parts of the path are rebuilt per locale, not just
    // the term slug.
    const restPath = rest.length ? `/${rest.join("/")}` : "";
    const result: Partial<Record<TLocale, string>> = {};
    for (const l of this.#locales) {
      const termSlugForLocale = termAlternates[l];
      const urlSegmentForLocale = this.#deps.getTaxonomyUrlSegment({
        collectionName: collectionKey,
        taxonomyName,
        lang: l,
      });
      if (!termSlugForLocale || !urlSegmentForLocale) continue;
      result[l] = this.#deps.getCollectionPath({
        collectionName: collectionKey,
        lang: l,
        rest: `/${urlSegmentForLocale}/${termSlugForLocale}${restPath}`,
      });
    }
    return result;
  }
}
