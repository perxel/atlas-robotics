import type { SeoAuditRow, SeoCoverage, SeoFields, SeoSourceType } from "../types";

type SeoIndexEntry<TLocale extends string> = {
  filename: string;
  locale: TLocale;
  slug: string;
  seo: unknown;
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

  #isComplete(seo: SeoFields): boolean {
    return this.#requiredFields.every((field) => !!(seo as Record<string, unknown> | null | undefined)?.[field]);
  }

  #missingFields(seo: SeoFields): Array<keyof NonNullable<SeoFields>> {
    return this.#requiredFields.filter((field) => !(seo as Record<string, unknown> | null | undefined)?.[field]);
  }

  async getCoverage(): Promise<SeoCoverage<TCollectionName, TLocale>[]> {
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
            (entry) => defaultFilenames.has(entry.filename) && this.#isComplete(entry.seo as SeoFields)
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

  async getAudit(args?: {
    collectionName?: TCollectionName;
    onlyMissing?: boolean;
  }): Promise<SeoAuditRow<TCollectionName, TLocale>[]> {
    const names = args?.collectionName ? [args.collectionName] : this.#sortedNames();

    const rows: SeoAuditRow<TCollectionName, TLocale>[] = [];
    for (const collectionName of names) {
      const index = await this.#deps.getSeoIndex(collectionName);
      for (const entry of index) {
        const seo = entry.seo as SeoFields;
        const missingFields = this.#missingFields(seo);
        rows.push({
          collectionName,
          label: this.#deps.getLabel(collectionName),
          type: this.#deps.getType(collectionName),
          locale: entry.locale,
          slug: entry.slug,
          filename: entry.filename,
          seo,
          missingFields,
          // A generic SEO index only carries {filename, locale, slug, seo} —
          // not enough context to know whether a specific route's fallback
          // (e.g. a listing page's dictionary-sourced title vs. a detail
          // page's own `title` field) actually covers a missing field, so
          // this always reports empty rather than guessing. Revisit if a
          // richer index becomes worth the cost — see the plan's own note
          // that this default may not feel right in practice.
          usingFallback: [],
        });
      }
    }

    return args?.onlyMissing ? rows.filter((row) => row.missingFields.length > 0) : rows;
  }
}
