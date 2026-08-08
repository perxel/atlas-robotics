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
