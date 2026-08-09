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

/** A resolved SEO value paired with whether it came from an explicit editor
 * value or the route's own fallback (post title/excerpt, etc). Returned by
 * `SeoService`'s `getMetaTitle`/`getMetaDescription`/`getOgImage`/
 * `getOgImageAlt` — the one place that resolution logic lives, consumed both
 * by page rendering (`SeoService.buildMetadata`) and by the SEO dashboard's
 * scoring, so both agree on what "the value" actually is. */
export type ResolvedSeoValue<T> = { value: T; isFallback: boolean };

/** The four fields the SEO dashboard scores — see `SeoDashboardService`'s
 * rubric (30/30/25/15 points, summing to 100). */
export type SeoScoredField = "metaTitle" | "metaDescription" | "ogImage" | "ogImageAlt";

export type SeoFieldScore = {
  field: SeoScoredField;
  points: number;
  maxPoints: number;
  /** Human-readable explanation of the points awarded, e.g. "42 chars, ideal
   * 30–60" or "Missing" — shown directly in the audit table so a low score
   * is never just a bare number. */
  reason: string;
  isFallback: boolean;
  /** The actual resolved text — the title/description string, the image
   * path, the alt text — same value the score itself was computed from, so
   * the audit table can show it next to the reason instead of making an
   * editor go open the document just to see what's there. `undefined` when
   * the field is genuinely empty. */
  value: string | undefined;
};

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
  /** One entry per scored field, in `SeoScoredField` order. */
  scores: SeoFieldScore[];
  /** Sum of `scores[].points`, out of 100. */
  totalScore: number;
};

export type SeoCoverage<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  /** English source label, e.g. "Product Categories" — for display. */
  label: string;
  type: SeoSourceType;
  countsByLocale: Record<TLocale, number>;
  /** Sum (not average) of every document's `totalScore` in this locale —
   * kept alongside `avgScoreByLocale` so a caller aggregating across
   * multiple rows (the dashboard's site-wide score) can sum-then-divide
   * once instead of averaging already-rounded per-row percentages. */
  totalScoreByLocale: Record<TLocale, number>;
  avgScoreByLocale: Record<TLocale, number>;
};
