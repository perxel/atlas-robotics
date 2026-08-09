import type { CollectionCoverage, TranslationAuditRow, TranslationSourceType } from "../types";
import { sortByOrder } from "../../sort-by-order";

/**
 * Answers "this collection has 10 in en, 12 in vi, 4 in zh, % coverage" plus
 * a per-document audit ("this doc has no vi translation") for the Tina
 * admin Translation Dashboard screen — same construction as the SEO
 * Dashboard (cms/seo/dashboard). Depends on CollectionService/TaxonomyService/
 * PagesService via "Option A" injection (bound functions, not the whole
 * instance).
 */
export class TranslationDashboardService<TCollectionName extends string, TLocale extends string> {
  #deps: {
    getRegisteredCollectionNames: () => TCollectionName[];
    getItemLocaleIndex: (collectionName: TCollectionName) => Promise<{ filename: string; locale: TLocale }[]>;
    getLabel: (collectionName: TCollectionName) => string;
    getType: (collectionName: TCollectionName) => TranslationSourceType;
  };
  #locales: readonly TLocale[];
  #defaultLocale: TLocale;
  #order?: readonly TCollectionName[];

  constructor(
    deps: {
      getRegisteredCollectionNames: () => TCollectionName[];
      getItemLocaleIndex: (collectionName: TCollectionName) => Promise<{ filename: string; locale: TLocale }[]>;
      getLabel: (collectionName: TCollectionName) => string;
      getType: (collectionName: TCollectionName) => TranslationSourceType;
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
    // this is also what every consumer (getStats's Record insertion order,
    // and the dashboard screen reading Object.keys() off it) uses as column
    // order, so reordering once here is enough to fix both. Same rule as
    // SeoDashboardService.
    this.#locales = [options.defaultLocale, ...options.locales.filter((l) => l !== options.defaultLocale)];
    this.#defaultLocale = options.defaultLocale;
    this.#order = options.order;
  }

  /** Registered names sorted per `options.order`, when given. */
  #sortedNames(): TCollectionName[] {
    return sortByOrder(this.#deps.getRegisteredCollectionNames(), this.#order);
  }

  /** Every locale's filename set for a collection, keyed by locale — shared
   * by getStats and getAudit so both agree on exactly which documents count
   * as "should be translated." */
  async #filenamesByLocale(collectionName: TCollectionName): Promise<Map<TLocale, Set<string>>> {
    const index = await this.#deps.getItemLocaleIndex(collectionName);
    const filenamesByLocale = new Map<TLocale, Set<string>>(this.#locales.map((l) => [l, new Set<string>()]));
    for (const item of index) {
      filenamesByLocale.get(item.locale)?.add(item.filename);
    }
    return filenamesByLocale;
  }

  async getStats(): Promise<CollectionCoverage<TCollectionName, TLocale>[]> {
    const names = this.#sortedNames();

    return Promise.all(
      names.map(async (collectionName) => {
        const filenamesByLocale = await this.#filenamesByLocale(collectionName);

        // % of defaultLocale's filenames that also have a same-filename
        // document in this locale — matches how cross-locale pairing works
        // everywhere else in this app (by filename), so coverage means
        // "actually translated," not just "this locale happens to have N
        // documents that may not correspond to anything."
        const defaultFilenames = filenamesByLocale.get(this.#defaultLocale) ?? new Set<string>();

        const countsByLocale = {} as Record<TLocale, number>;
        const translatedByLocale = {} as Record<TLocale, number>;
        const coveragePercentByLocale = {} as Record<TLocale, number>;
        for (const locale of this.#locales) {
          const filenames = filenamesByLocale.get(locale) ?? new Set<string>();
          const translated = [...defaultFilenames].filter((f) => filenames.has(f)).length;
          countsByLocale[locale] = defaultFilenames.size;
          translatedByLocale[locale] = translated;
          coveragePercentByLocale[locale] =
            defaultFilenames.size === 0 ? 100 : Math.round((translated / defaultFilenames.size) * 100);
        }

        return {
          collectionName,
          label: this.#deps.getLabel(collectionName),
          type: this.#deps.getType(collectionName),
          countsByLocale,
          translatedByLocale,
          coveragePercentByLocale,
        };
      })
    );
  }

  /** One row per default-locale document that has no same-filename
   * counterpart in some other locale — the detail behind a collection's
   * coverage % dropping below 100. */
  async getAudit(): Promise<TranslationAuditRow<TCollectionName, TLocale>[]> {
    const names = this.#sortedNames();
    const rows: TranslationAuditRow<TCollectionName, TLocale>[] = [];

    for (const collectionName of names) {
      const filenamesByLocale = await this.#filenamesByLocale(collectionName);
      const defaultFilenames = [...(filenamesByLocale.get(this.#defaultLocale) ?? new Set<string>())].sort();

      for (const locale of this.#locales) {
        if (locale === this.#defaultLocale) continue;
        const filenames = filenamesByLocale.get(locale) ?? new Set<string>();
        for (const filename of defaultFilenames) {
          if (!filenames.has(filename)) {
            rows.push({
              collectionName,
              label: this.#deps.getLabel(collectionName),
              type: this.#deps.getType(collectionName),
              filename,
              sourceLocale: this.#defaultLocale,
              missingLocale: locale,
            });
          }
        }
      }
    }

    return rows;
  }
}
