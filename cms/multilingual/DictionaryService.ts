import type { DictionaryEntry } from "./types";
import { translateText } from "./translate-text";

export class DictionaryService<TLocale extends string> {
  #fetchEntries: () => Promise<DictionaryEntry[]>;
  #defaultLocale: TLocale;

  constructor(deps: { fetchEntries: () => Promise<DictionaryEntry[]> }, options: { defaultLocale: TLocale }) {
    this.#fetchEntries = deps.fetchEntries;
    this.#defaultLocale = options.defaultLocale;
  }

  /** The full resolved `{ sourceText: translation }` snapshot for one
   * locale — one fetch, safe to pass down as a plain prop through any
   * number of components (including client ones). Entries with no value
   * set for this locale are simply omitted, so `translateText()` falls
   * through to the source text automatically. */
  async loadMap(lang?: TLocale): Promise<Record<string, string>> {
    const entries = await this.#fetchEntries();
    const locale = lang ?? this.#defaultLocale;
    const map: Record<string, string> = {};
    for (const entry of entries) {
      const value = entry.values[locale];
      if (value) map[entry.key] = value;
    }
    return map;
  }

  /** One fetch, wrapped as a synchronous lookup function — `await` once at
   * the top of a genuine server component (never passed down as a prop;
   * see translateText()'s comment on why a closure can't cross into a
   * client subtree) and call the result freely and inline through JSX
   * below it, same ergonomics as the old `const dict = getDictionary(locale)`. */
  async load(lang?: TLocale): Promise<(sourceText: string) => string> {
    const map = await this.loadMap(lang);
    return (sourceText: string) => translateText(map, sourceText);
  }

  async translate(sourceText: string, lang?: TLocale): Promise<string> {
    const map = await this.loadMap(lang);
    return translateText(map, sourceText);
  }
}
