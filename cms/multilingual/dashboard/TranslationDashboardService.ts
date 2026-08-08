import type { CollectionCoverage } from "../types";

/**
 * Answers "this collection has 10 in en, 12 in vi, 4 in zh, % coverage" for
 * the Tina admin Translation Dashboard screen. Depends on CollectionService
 * via "Option A" injection (getRegisteredCollectionNames/getItemLocaleIndex
 * bound functions, not the whole instance).
 */
export class TranslationDashboardService<TCollectionName extends string, TLocale extends string> {
  #deps: {
    getRegisteredCollectionNames: () => TCollectionName[];
    getItemLocaleIndex: (collectionName: TCollectionName) => Promise<{ filename: string; locale: TLocale }[]>;
  };
  #locales: readonly TLocale[];
  #defaultLocale: TLocale;

  constructor(
    deps: {
      getRegisteredCollectionNames: () => TCollectionName[];
      getItemLocaleIndex: (collectionName: TCollectionName) => Promise<{ filename: string; locale: TLocale }[]>;
    },
    options: { locales: readonly TLocale[]; defaultLocale: TLocale }
  ) {
    this.#deps = deps;
    this.#locales = options.locales;
    this.#defaultLocale = options.defaultLocale;
  }

  async getStats(): Promise<CollectionCoverage<TCollectionName, TLocale>[]> {
    const names = this.#deps.getRegisteredCollectionNames();

    return Promise.all(
      names.map(async (collectionName) => {
        const index = await this.#deps.getItemLocaleIndex(collectionName);

        const filenamesByLocale = new Map<TLocale, Set<string>>(this.#locales.map((l) => [l, new Set<string>()]));
        for (const item of index) {
          filenamesByLocale.get(item.locale)?.add(item.filename);
        }

        // % of defaultLocale's filenames that also have a same-filename
        // document in this locale — matches how cross-locale pairing works
        // everywhere else in this app (by filename), so coverage means
        // "actually translated," not just "this locale happens to have N
        // documents that may not correspond to anything."
        const defaultFilenames = filenamesByLocale.get(this.#defaultLocale) ?? new Set<string>();

        const countsByLocale = {} as Record<TLocale, number>;
        const coveragePercentByLocale = {} as Record<TLocale, number>;
        for (const locale of this.#locales) {
          const filenames = filenamesByLocale.get(locale) ?? new Set<string>();
          countsByLocale[locale] = filenames.size;
          const translated = [...defaultFilenames].filter((f) => filenames.has(f)).length;
          coveragePercentByLocale[locale] =
            defaultFilenames.size === 0 ? 100 : Math.round((translated / defaultFilenames.size) * 100);
        }

        return { collectionName, countsByLocale, coveragePercentByLocale };
      })
    );
  }
}
