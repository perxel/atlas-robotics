import type { SeoAuditRow, SeoCoverage, SeoFields } from "../types";

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
  };
  #locales: readonly TLocale[];
  #requiredFields: Array<keyof NonNullable<SeoFields>>;

  constructor(
    deps: {
      getRegisteredCollectionNames: () => TCollectionName[];
      getSeoIndex: (collectionName: TCollectionName) => Promise<SeoIndexEntry<TLocale>[]>;
    },
    options: {
      locales: readonly TLocale[];
      defaultLocale: TLocale;
      requiredFields?: Array<keyof NonNullable<SeoFields>>;
    }
  ) {
    this.#deps = deps;
    this.#locales = options.locales;
    this.#requiredFields = options.requiredFields ?? DEFAULT_REQUIRED_FIELDS;
  }

  #isComplete(seo: SeoFields): boolean {
    return this.#requiredFields.every((field) => !!(seo as Record<string, unknown> | null | undefined)?.[field]);
  }

  #missingFields(seo: SeoFields): Array<keyof NonNullable<SeoFields>> {
    return this.#requiredFields.filter((field) => !(seo as Record<string, unknown> | null | undefined)?.[field]);
  }

  async getCoverage(): Promise<SeoCoverage<TCollectionName, TLocale>[]> {
    const names = this.#deps.getRegisteredCollectionNames();

    return Promise.all(
      names.map(async (collectionName) => {
        const index = await this.#deps.getSeoIndex(collectionName);

        const countsByLocale = {} as Record<TLocale, number>;
        const completeByLocale = {} as Record<TLocale, number>;
        const completionPercentByLocale = {} as Record<TLocale, number>;

        for (const locale of this.#locales) {
          const docs = index.filter((entry) => entry.locale === locale);
          const complete = docs.filter((entry) => this.#isComplete(entry.seo as SeoFields)).length;
          countsByLocale[locale] = docs.length;
          completeByLocale[locale] = complete;
          completionPercentByLocale[locale] = docs.length === 0 ? 100 : Math.round((complete / docs.length) * 100);
        }

        return { collectionName, countsByLocale, completeByLocale, completionPercentByLocale };
      })
    );
  }

  async getAudit(args?: {
    collectionName?: TCollectionName;
    onlyMissing?: boolean;
  }): Promise<SeoAuditRow<TCollectionName, TLocale>[]> {
    const names = args?.collectionName ? [args.collectionName] : this.#deps.getRegisteredCollectionNames();

    const rows: SeoAuditRow<TCollectionName, TLocale>[] = [];
    for (const collectionName of names) {
      const index = await this.#deps.getSeoIndex(collectionName);
      for (const entry of index) {
        const seo = entry.seo as SeoFields;
        const missingFields = this.#missingFields(seo);
        rows.push({
          collectionName,
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
