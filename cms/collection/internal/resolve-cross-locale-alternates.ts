import type { Edge } from "../types";
import { inLocale } from "./in-locale";

function filenameOf(item: { _sys: { relativePath: string } }): string | undefined {
  return item._sys.relativePath.split("/").pop()?.replace(/\.md$/, "");
}

/**
 * Cross-locale sibling lookup, given the current document's slug (as it
 * appears in `locale`'s URL): finds its filename, then finds the sibling
 * with that same filename in every locale, mapping each to a URL via
 * `buildUrl`. Documents are paired by filename — nothing else does, since
 * each locale's document is otherwise a fully independent file, and a
 * locale with no sibling document is simply omitted rather than assumed to
 * exist under the same slug.
 */
export function resolveCrossLocaleAlternates<
  TLocale extends string,
  T extends { slug: string; _sys: { relativePath: string; breadcrumbs: string[] } },
>(args: {
  edges: Array<Edge<T>> | null | undefined;
  locales: readonly TLocale[];
  locale: TLocale;
  slug: string;
  buildUrl: (locale: TLocale, doc: T) => string;
}): Partial<Record<TLocale, string>> {
  const current = inLocale(args.edges, args.locale).find((d) => d.slug === args.slug);
  const filename = current ? filenameOf(current) : undefined;
  if (!filename) return {};

  const result: Partial<Record<TLocale, string>> = {};
  for (const l of args.locales) {
    const doc = inLocale(args.edges, l).find((d) => filenameOf(d) === filename);
    if (doc) result[l] = args.buildUrl(l, doc);
  }
  return result;
}
