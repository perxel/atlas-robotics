import type { SingletonRegistryEntry } from "./types";

/**
 * A "named singleton document" — one file per locale, no list and no slug
 * of its own (site settings, nav, footer, ...). Generic over which
 * singletons a project registers; a project adds another one (e.g.
 * "socialLinks") by adding a row to its registry, not by writing a new
 * get*() function each time.
 */
export class SingletonService<TName extends string, TLocale extends string> {
  #registry: Record<TName, SingletonRegistryEntry<TLocale>>;
  #defaultLocale: TLocale;

  constructor(registry: Record<TName, SingletonRegistryEntry<TLocale>>, options: { defaultLocale: TLocale }) {
    this.#registry = registry;
    this.#defaultLocale = options.defaultLocale;
  }

  /** Returns `null` on any failure (missing document, fetch error) rather
   * than throwing — a page's job is to render a sensible fallback, not crash. */
  async get<T>(args: { name: TName; lang?: TLocale }): Promise<T | null> {
    const locale = args.lang ?? this.#defaultLocale;
    try {
      const doc = await this.#registry[args.name].fetchDoc(locale);
      return (doc ?? null) as T | null;
    } catch {
      return null;
    }
  }
}
