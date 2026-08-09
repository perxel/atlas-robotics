import type { SeoService } from "../SeoService";
import type { ResolvedSeoValue, SeoAuditRow, SeoCoverage, SeoFieldScore, SeoFields, SeoSourceType } from "../types";

type SeoIndexEntry<TLocale extends string> = {
  filename: string;
  locale: TLocale;
  slug: string;
  seo: unknown;
  /** What the document's own render route would fall back to per required
   * field, when `seo` doesn't set it explicitly — see the three
   * `getSeoIndex()` implementations (CollectionService, PagesService,
   * TaxonomyService) for what each source actually puts here. */
  fallback?: { metaTitle?: string | null; metaDescription?: string | null };
};

/**
 * Coverage summary + a detail audit table for the Tina admin SEO Dashboard
 * — same construction as the Translation Dashboard (cms/multilingual).
 * See .claude/plans/04-seo.md.
 *
 * Scores each document 0–100 across four rule-based checks (title length,
 * description length, social image, image alt text) rather than a binary
 * "has the field or not" — see `#scoreEntry`'s doc comment for the rubric.
 * Every check resolves its value through `SeoService`'s
 * `getMetaTitle`/`getMetaDescription`/`getOgImage`/`getOgImageAlt` — the same
 * resolution page rendering uses (`SeoService.buildMetadata`) — so the score
 * always reflects what actually renders live, fallback included, and never
 * drifts from it.
 */
export class SeoDashboardService<TCollectionName extends string, TLocale extends string> {
  #deps: {
    getRegisteredCollectionNames: () => TCollectionName[];
    getSeoIndex: (collectionName: TCollectionName) => Promise<SeoIndexEntry<TLocale>[]>;
    getLabel: (collectionName: TCollectionName) => string;
    getType: (collectionName: TCollectionName) => SeoSourceType;
    seoService: SeoService<TLocale>;
  };
  #locales: readonly TLocale[];
  #order?: readonly TCollectionName[];

  constructor(
    deps: {
      getRegisteredCollectionNames: () => TCollectionName[];
      getSeoIndex: (collectionName: TCollectionName) => Promise<SeoIndexEntry<TLocale>[]>;
      getLabel: (collectionName: TCollectionName) => string;
      getType: (collectionName: TCollectionName) => SeoSourceType;
      seoService: SeoService<TLocale>;
    },
    options: {
      locales: readonly TLocale[];
      defaultLocale: TLocale;
      /** Display order for rows — names not listed sort after every listed
       * name, in their original relative order. Omit to use whatever order
       * `getRegisteredCollectionNames` returns. */
      order?: readonly TCollectionName[];
    }
  ) {
    this.#deps = deps;
    // defaultLocale first, everything else in its configured relative order —
    // this is also what every consumer (getCoverage's Record insertion order,
    // and the dashboard screen reading Object.keys() off it) uses as column
    // order, so reordering once here is enough to fix both.
    this.#locales = [options.defaultLocale, ...options.locales.filter((l) => l !== options.defaultLocale)];
    this.#order = options.order;
  }

  /** Registered names sorted per `options.order`, when given — a stable
   * sort, so unlisted names keep their original relative order at the end. */
  #sortedNames(): TCollectionName[] {
    const names = this.#deps.getRegisteredCollectionNames();
    if (!this.#order) return names;
    const rank = new Map(this.#order.map((name, i) => [name, i]));
    return [...names].sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity));
  }

  /** Scores a resolved title/description against an ideal character range:
   * missing scores 0, present-but-outside-range scores half credit, present
   * and within range scores full credit. The ranges themselves track
   * Google's SERP truncation points — ~60 chars for a title, ~160 for a
   * description — not an arbitrary "non-empty" bar. */
  #scoreTextField(
    field: "metaTitle" | "metaDescription",
    resolved: ResolvedSeoValue<string | undefined>,
    min: number,
    max: number,
    maxPoints: number
  ): SeoFieldScore {
    const { value, isFallback } = resolved;
    if (!value) {
      return { field, points: 0, maxPoints, reason: "Missing", isFallback: false, value: undefined };
    }
    const len = value.length;
    const ideal = len >= min && len <= max;
    const source = isFallback ? " (using fallback)" : "";
    const verdict = ideal ? "Good length" : len < min ? "Too short" : "Too long";
    return {
      field,
      points: ideal ? maxPoints : Math.round(maxPoints * 0.5),
      maxPoints,
      reason: `${verdict} — ${len} chars, ideal ${min}–${max}${source}`,
      isFallback,
      value,
    };
  }

  #scoreOgImage(resolved: ResolvedSeoValue<string | undefined>): SeoFieldScore {
    const maxPoints = 25;
    if (!resolved.value) {
      return { field: "ogImage", points: 0, maxPoints, reason: "Missing", isFallback: false, value: undefined };
    }
    return {
      field: "ogImage",
      points: maxPoints,
      maxPoints,
      reason: resolved.isFallback ? "Set (using fallback)" : "Set",
      isFallback: resolved.isFallback,
      value: resolved.value,
    };
  }

  /** Alt text only matters when there's actually an image to describe — no
   * image at all auto-passes rather than penalizing a document twice for
   * one missing image. */
  #scoreOgImageAlt(seo: SeoFields, ogImageScore: SeoFieldScore): SeoFieldScore {
    const maxPoints = 15;
    if (ogImageScore.points === 0) {
      return {
        field: "ogImageAlt",
        points: maxPoints,
        maxPoints,
        reason: "N/A — no image set",
        isFallback: false,
        value: undefined,
      };
    }
    const alt = this.#deps.seoService.getOgImageAlt(seo).value;
    return alt
      ? { field: "ogImageAlt", points: maxPoints, maxPoints, reason: "Alt text set", isFallback: false, value: alt }
      : {
          field: "ogImageAlt",
          points: 0,
          maxPoints,
          reason: "Image has no alt text",
          isFallback: false,
          value: undefined,
        };
  }

  /**
   * The scoring rubric, 100 points total:
   *  - metaTitle (30): 30–60 chars ideal
   *  - metaDescription (30): 70–160 chars ideal
   *  - ogImage (25): present
   *  - ogImageAlt (15): present when ogImage is set, else N/A
   *
   * Every value is resolved via `SeoService` (explicit value, or its
   * route's own fallback) — see the class doc comment for why that matters.
   * `fallback` here never carries an image (see `SeoIndexEntry`'s doc
   * comment), matching every real route today: none of them pass
   * `fallbackOgImage` to `buildMetadata`.
   */
  #scoreEntry(seo: SeoFields, fallback: SeoIndexEntry<TLocale>["fallback"]): { scores: SeoFieldScore[]; total: number } {
    const titleResolved = this.#deps.seoService.getMetaTitle(seo, fallback?.metaTitle ?? "");
    const descriptionResolved = this.#deps.seoService.getMetaDescription(seo, fallback?.metaDescription);
    const ogImageResolved = this.#deps.seoService.getOgImage(seo, undefined);

    const titleScore = this.#scoreTextField("metaTitle", titleResolved, 30, 60, 30);
    const descriptionScore = this.#scoreTextField("metaDescription", descriptionResolved, 70, 160, 30);
    const ogImageScore = this.#scoreOgImage(ogImageResolved);
    const ogImageAltScore = this.#scoreOgImageAlt(seo, ogImageScore);

    const scores = [titleScore, descriptionScore, ogImageScore, ogImageAltScore];
    return { scores, total: scores.reduce((sum, s) => sum + s.points, 0) };
  }

  async getCoverage(): Promise<SeoCoverage<TCollectionName, TLocale>[]> {
    const names = this.#sortedNames();

    return Promise.all(
      names.map(async (collectionName) => {
        const index = await this.#deps.getSeoIndex(collectionName);

        const countsByLocale = {} as Record<TLocale, number>;
        const totalScoreByLocale = {} as Record<TLocale, number>;
        const avgScoreByLocale = {} as Record<TLocale, number>;

        // Averaged over "the documents that actually exist in this locale"
        // — NOT the default locale's doc count. A locale missing a
        // translation entirely is a translation gap (TranslationDashboardService
        // already tracks that); it isn't an SEO-metadata gap, and denominating
        // by the default locale's count here previously conflated the two —
        // a locale with 4 of 10 documents translated, all 4 scoring 100,
        // read as "40%", which looked like an SEO problem when it was really
        // a perfect-metadata story on a partially-translated locale.
        for (const locale of this.#locales) {
          const docs = index.filter((entry) => entry.locale === locale);
          const totalScore = docs.reduce((sum, entry) => sum + this.#scoreEntry(entry.seo as SeoFields, entry.fallback).total, 0);
          countsByLocale[locale] = docs.length;
          totalScoreByLocale[locale] = totalScore;
          avgScoreByLocale[locale] = docs.length === 0 ? 100 : Math.round(totalScore / docs.length);
        }

        return {
          collectionName,
          label: this.#deps.getLabel(collectionName),
          type: this.#deps.getType(collectionName),
          countsByLocale,
          totalScoreByLocale,
          avgScoreByLocale,
        };
      })
    );
  }

  /** Rows are always sorted worst-first (`totalScore` ascending) so the
   * documents needing the most attention surface at the top regardless of
   * collection order. */
  async getAudit(args?: {
    collectionName?: TCollectionName;
    /** Drop any row that already scores a perfect 100. */
    onlyImperfect?: boolean;
  }): Promise<SeoAuditRow<TCollectionName, TLocale>[]> {
    const names = args?.collectionName ? [args.collectionName] : this.#sortedNames();

    const rows: SeoAuditRow<TCollectionName, TLocale>[] = [];
    for (const collectionName of names) {
      const index = await this.#deps.getSeoIndex(collectionName);
      for (const entry of index) {
        const seo = entry.seo as SeoFields;
        const { scores, total } = this.#scoreEntry(seo, entry.fallback);
        rows.push({
          collectionName,
          label: this.#deps.getLabel(collectionName),
          type: this.#deps.getType(collectionName),
          locale: entry.locale,
          slug: entry.slug,
          filename: entry.filename,
          seo,
          scores,
          totalScore: total,
        });
      }
    }

    const filtered = args?.onlyImperfect ? rows.filter((row) => row.totalScore < 100) : rows;
    return filtered.sort((a, b) => a.totalScore - b.totalScore);
  }
}
