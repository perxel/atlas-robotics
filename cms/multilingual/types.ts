export type SwitcherConfigItem = {
  locale?: string | null;
  label?: string | null;
  flag?: string | null;
} | null;

export type SwitcherEntry<TLocale extends string> = {
  locale: TLocale;
  label: string;
  flag?: string | null;
  href: string;
  isCurrent: boolean;
};

export type DictionaryEntry = {
  key: string;
  values: Record<string, string | null | undefined>;
};

/** "content" for an individually-publishable collection (including
 * `pages`), "taxonomy" for a term store (`categories`, `productCategories`)
 * — same two values as `SeoSourceType` (cms/seo/types.ts), kept as a plain
 * literal here rather than imported so this module doesn't pick up a
 * cross-domain dependency on cms/seo for a trivial 2-value union. */
export type TranslationSourceType = "content" | "taxonomy";

export type CollectionCoverage<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  /** English source label, e.g. "Product Categories" — for display. */
  label: string;
  type: TranslationSourceType;
  countsByLocale: Record<TLocale, number>;
  /** Of `countsByLocale[defaultLocale]` documents, how many have a
   * same-filename counterpart in this locale — the numerator behind
   * `coveragePercentByLocale`, exposed separately so a caller aggregating
   * across rows (the dashboard's overall coverage card) can sum-then-divide
   * once instead of averaging already-rounded per-row percentages. */
  translatedByLocale: Record<TLocale, number>;
  coveragePercentByLocale: Record<TLocale, number>;
};

/** One row per (document, locale it hasn't been translated into) — a
 * default-locale document with no same-filename counterpart in
 * `missingLocale`. `sourceLocale` is always the collection's default
 * locale today (the only locale a "missing translation" can be sourced
 * from), kept as its own field rather than hardcoded so the audit table
 * can build an edit link without importing defaultLocale separately. */
export type TranslationAuditRow<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  label: string;
  type: TranslationSourceType;
  filename: string;
  sourceLocale: TLocale;
  missingLocale: TLocale;
};
