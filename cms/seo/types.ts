export type SeoFields =
  | {
      metaTitle?: string | null;
      metaDescription?: string | null;
      ogImage?: string | null;
      ogImageAlt?: string | null;
    }
  | null
  | undefined;

export type SeoSourceType = "content" | "taxonomy";

export type SeoAuditRow<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  /** English source label, e.g. "Product Categories" — for display, never
   * matched/filtered on (collectionName is the identity). */
  label: string;
  /** "content" for an individually-publishable collection (including
   * `pages`), "taxonomy" for a term store (`categories`, `productCategories`). */
  type: SeoSourceType;
  locale: TLocale;
  slug: string;
  filename: string;
  /** The actual current values — "see current SEO text." */
  seo: SeoFields;
  /** Required fields that are genuinely empty. */
  missingFields: Array<keyof NonNullable<SeoFields>>;
  /** Empty but a site-wide fallback covers it — tracked separately from
   * `missingFields` so coverage % reflects real gaps, not "hasn't been
   * hand-tuned yet." */
  usingFallback: Array<keyof NonNullable<SeoFields>>;
};

export type SeoCoverage<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  /** English source label, e.g. "Product Categories" — for display. */
  label: string;
  type: SeoSourceType;
  countsByLocale: Record<TLocale, number>;
  completeByLocale: Record<TLocale, number>;
  completionPercentByLocale: Record<TLocale, number>;
};
