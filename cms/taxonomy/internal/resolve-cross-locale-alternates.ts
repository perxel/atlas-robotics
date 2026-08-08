import type { Edge, TermDoc } from "../types";

function filenameOf(doc: TermDoc): string | undefined {
  return doc._sys.relativePath.split("/").pop()?.replace(/\.md$/, "");
}

/**
 * Cross-locale lookup for a taxonomy term, given the term's slug as it
 * appears in `locale`'s URL. Same shape as cms/collection's version, reused
 * here for a taxonomy term document instead of a content document — term
 * docs across locales are paired by filename, and each locale's own `slug`
 * field can genuinely diverge from the others (same as a `pages` document's
 * slug can), so this needs a real per-locale lookup rather than a string
 * transform.
 */
export function resolveTermCrossLocaleAlternates<TLocale extends string>(args: {
  edges: Array<Edge<TermDoc>> | null | undefined;
  locales: readonly TLocale[];
  locale: TLocale;
  termSlug: string;
}): Partial<Record<TLocale, string>> {
  const inLocale = (l: TLocale) =>
    (args.edges || [])
      .map((edge) => edge?.node)
      .filter((node): node is TermDoc => !!node && node._sys.breadcrumbs[0] === l);

  const current = inLocale(args.locale).find((d) => d.slug === args.termSlug);
  const filename = current ? filenameOf(current) : undefined;
  if (!filename) return {};

  const result: Partial<Record<TLocale, string>> = {};
  for (const l of args.locales) {
    const doc = inLocale(l).find((d) => filenameOf(d) === filename);
    if (doc) result[l] = doc.slug;
  }
  return result;
}
