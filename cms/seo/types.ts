export type SeoFields =
  | {
      metaTitle?: string | null;
      metaDescription?: string | null;
      ogImage?: string | null;
      ogImageAlt?: string | null;
    }
  | null
  | undefined;

export type SeoAuditRow<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
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
  countsByLocale: Record<TLocale, number>;
  completeByLocale: Record<TLocale, number>;
  completionPercentByLocale: Record<TLocale, number>;
};
