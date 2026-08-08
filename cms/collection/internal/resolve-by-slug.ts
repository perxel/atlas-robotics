import type { Edge } from "../types";
import { inLocale } from "./in-locale";

type BySlugItem = {
  slug?: string;
  _sys: { breadcrumbs: string[]; relativePath: string };
  [key: string]: unknown;
};

/**
 * Two-step slug resolution: find the matching item's `relativePath` among
 * already-fetched edges (filtered by locale, slug, and draft status), then
 * hand off to `fetchBySlug` for the actual single-document fetch — never by
 * assuming filename === slug, since Tina lets editors set those
 * independently. Safe to trust `slug` as unique per locale because a
 * `slugLifecycleGuard`-guarded collection blocks saving a duplicate.
 */
export async function resolveBySlug<TLocale extends string>(args: {
  fetchEdges: () => Promise<Array<Edge<unknown>> | null | undefined>;
  fetchBySlug: (relativePath: string) => Promise<unknown>;
  locale: TLocale;
  slug: string;
  draftFieldName?: string;
}): Promise<unknown | null> {
  const edges = await args.fetchEdges();
  const candidates = inLocale<BySlugItem>(edges as Array<Edge<BySlugItem>>, args.locale).filter(
    (item) => item.slug === args.slug
  );
  const match = args.draftFieldName
    ? candidates.find((item) => !item[args.draftFieldName as string]) ?? null
    : candidates[0] ?? null;

  if (!match?._sys?.relativePath) return null;
  return args.fetchBySlug(match._sys.relativePath);
}
