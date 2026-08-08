export type SingletonRegistryEntry<TLocale extends string> = {
  /** Fetches this singleton's document for one locale. Throwing or
   * resolving to a falsy value are both treated as "not found" by
   * SingletonService.get() — matching the project's existing site-
   * settings/nav/footer tolerant-fallback behavior (a missing document
   * degrades the page, it doesn't crash it). */
  fetchDoc: (locale: TLocale) => Promise<unknown>;
};
