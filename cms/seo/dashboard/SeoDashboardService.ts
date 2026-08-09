import type { SeoAuditRow, SeoCoverage, SeoCoverageMode, SeoFields, SeoSourceType } from "../types";

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

const DEFAULT_REQUIRED_FIELDS: Array<keyof NonNullable<SeoFields>> = ["metaTitle", "metaDescription"];

/**
 * Coverage summary + a detail audit table for the Tina admin SEO Dashboard
 * — same construction as the Translation Dashboard (cms/multilingual).
 * See .claude/plans/04-seo.md.
 */
export class SeoDashboardService<TCollectionName extends string, TLocale extends string> {
  #deps: {
    getRegisteredCollectionNames: () => TCollectionName[];
    getSeoIndex: (collectionName: TCollectionName) => Promise<SeoIndexEntry<TLocale>[]>;
    getLabel: (collectionName: TCollectionName) => string;
    getType: (collectionName: TCollectionName) => SeoSourceType;
  };
  #locales: readonly TLocale[];
  #defaultLocale: TLocale;
  #requiredFields: Array<keyof NonNullable<SeoFields>>;
  #order?: readonly TCollectionName[];

  constructor(
    deps: {
      getRegisteredCollectionNames: () => TCollectionName[];
      getSeoIndex: (collectionName: TCollectionName) => Promise<SeoIndexEntry<TLocale>[]>;
      getLabel: (collectionName: TCollectionName) => string;
      getType: (collectionName: TCollectionName) => SeoSourceType;
    },
    options: {
      locales: readonly TLocale[];
      defaultLocale: TLocale;
      requiredFields?: Array<keyof NonNullable<SeoFields>>;
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
    this.#defaultLocale = options.defaultLocale;
    this.#requiredFields = options.requiredFields ?? DEFAULT_REQUIRED_FIELDS;
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

  /** A field is satisfied if the editor set it explicitly, or — in
   * "lenient" mode only — the document's own render route has a working
   * fallback for it. "strict" mode ignores fallback entirely: only an
   * explicit value counts. */
  #isSatisfied(
    seo: SeoFields,
    fallback: SeoIndexEntry<TLocale>["fallback"],
    mode: SeoCoverageMode,
    field: keyof NonNullable<SeoFields>
  ): boolean {
    if (!!(seo as Record<string, unknown> | null | undefined)?.[field]) return true;
    return mode === "lenient" && !!(fallback as Record<string, unknown> | undefined)?.[field];
  }

  #isComplete(seo: SeoFields, fallback: SeoIndexEntry<TLocale>["fallback"], mode: SeoCoverageMode): boolean {
    return this.#requiredFields.every((field) => this.#isSatisfied(seo, fallback, mode, field));
  }

  #missingFields(
    seo: SeoFields,
    fallback: SeoIndexEntry<TLocale>["fallback"],
    mode: SeoCoverageMode
  ): Array<keyof NonNullable<SeoFields>> {
    return this.#requiredFields.filter((field) => !this.#isSatisfied(seo, fallback, mode, field));
  }

  /** Required fields with no explicit value but a working fallback —
   * computed independent of `mode`, so a "strict" audit row can still show
   * "missing, but the live page falls back to X" instead of reading like a
   * blank page. */
  #fallbackCoveredFields(
    seo: SeoFields,
    fallback: SeoIndexEntry<TLocale>["fallback"]
  ): Array<keyof NonNullable<SeoFields>> {
    return this.#requiredFields.filter(
      (field) =>
        !(seo as Record<string, unknown> | null | undefined)?.[field] &&
        !!(fallback as Record<string, unknown> | undefined)?.[field]
    );
  }

  /** @param mode "lenient" (default) counts a route's own fallback as
   * covering a field; "strict" only counts an explicit editor value. See
   * `SeoCoverageMode`'s doc comment. */
  async getCoverage(mode: SeoCoverageMode = "lenient"): Promise<SeoCoverage<TCollectionName, TLocale>[]> {
    const names = this.#sortedNames();

    return Promise.all(
      names.map(async (collectionName) => {
        const index = await this.#deps.getSeoIndex(collectionName);

        // % is always "of the default locale's documents" — same convention
        // as TranslationDashboardService.getStats(): a locale's own doc count
        // isn't the right denominator, since an untranslated locale's small
        // count would otherwise show a misleadingly high percentage (4 of 4
        // translated docs reading as "100%" when 6 more are simply missing).
        const defaultFilenames = new Set(
          index.filter((entry) => entry.locale === this.#defaultLocale).map((entry) => entry.filename)
        );

        const countsByLocale = {} as Record<TLocale, number>;
        const completeByLocale = {} as Record<TLocale, number>;
        const completionPercentByLocale = {} as Record<TLocale, number>;

        for (const locale of this.#locales) {
          const docs = index.filter((entry) => entry.locale === locale);
          const complete = docs.filter(
            (entry) =>
              defaultFilenames.has(entry.filename) && this.#isComplete(entry.seo as SeoFields, entry.fallback, mode)
          ).length;
          countsByLocale[locale] = defaultFilenames.size;
          completeByLocale[locale] = complete;
          completionPercentByLocale[locale] =
            defaultFilenames.size === 0 ? 100 : Math.round((complete / defaultFilenames.size) * 100);
        }

        return {
          collectionName,
          label: this.#deps.getLabel(collectionName),
          type: this.#deps.getType(collectionName),
          countsByLocale,
          completeByLocale,
          completionPercentByLocale,
        };
      })
    );
  }

  /** @param args.mode See `getCoverage`'s doc comment — defaults to
   * "lenient", same as `getCoverage`, so the two tables agree unless the
   * caller explicitly asks for the strict view. */
  async getAudit(args?: {
    collectionName?: TCollectionName;
    onlyMissing?: boolean;
    mode?: SeoCoverageMode;
  }): Promise<SeoAuditRow<TCollectionName, TLocale>[]> {
    const names = args?.collectionName ? [args.collectionName] : this.#sortedNames();
    const mode = args?.mode ?? "lenient";

    const rows: SeoAuditRow<TCollectionName, TLocale>[] = [];
    for (const collectionName of names) {
      const index = await this.#deps.getSeoIndex(collectionName);
      for (const entry of index) {
        const seo = entry.seo as SeoFields;
        rows.push({
          collectionName,
          label: this.#deps.getLabel(collectionName),
          type: this.#deps.getType(collectionName),
          locale: entry.locale,
          slug: entry.slug,
          filename: entry.filename,
          seo,
          missingFields: this.#missingFields(seo, entry.fallback, mode),
          // Independent of `mode` — even a "strict" row that counts as
          // missing can still say "but the live page falls back to X",
          // rather than reading like the page renders blank.
          usingFallback: this.#fallbackCoveredFields(seo, entry.fallback),
        });
      }
    }

    return args?.onlyMissing ? rows.filter((row) => row.missingFields.length > 0) : rows;
  }
}
