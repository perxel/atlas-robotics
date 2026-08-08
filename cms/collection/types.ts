import type { Paginated } from "@/cms/pagination";

export type Edge<T> = { node?: T | null } | null;

/**
 * Extracts the real item type from a Tina `*Connection` query's `edges`
 * field, e.g. `ConnectionItem<ProductsConnectionQuery["productsConnection"]["edges"]>`.
 * Tina's codegen never emits a standalone name for "one connection item" —
 * the `node` type is inlined anonymously inside each `*ConnectionQuery`
 * type, scoped to exactly the fields that query selected (a separately
 * named type like `Products` also exists, but it's the *full* schema type,
 * including fields the connection query never fetched — aliasing to it
 * would compile but lie about what's actually on the object at runtime).
 * The double unwrap mirrors two independently-nullable layers a GraphQL
 * cursor connection allows for: the edge itself, and that edge's `node`.
 */
export type ConnectionItem<
  TEdges extends readonly ({ node?: unknown } | null)[] | null | undefined,
> = NonNullable<NonNullable<NonNullable<TEdges>[number]>["node"]>;

export type SortDirection = "asc" | "desc";

/** Either a declarative field-based sort (works for any field name/shape a
 * project's data actually uses — "date"/"title" aren't assumed) or a plain
 * comparator for anything more custom. */
export type SortSpec<T> =
  | { field: keyof T & string; direction?: SortDirection; type?: "date" | "string" | "number" }
  | ((a: T, b: T) => number);

export type SeoIndexEntry = {
  filename: string;
  slug: string;
  seo: unknown;
};

export type CollectionRegistryEntry<TLocale extends string> = {
  /** Per-locale URL segment for this collection's own routes, e.g. `{ en: "blog", vi: "tin-tuc" }`. */
  locales: Record<TLocale, string>;
  /** The `pages` document (matched by filename) backing this collection's listing page. */
  listingPageFilename: string;
  /** Items per page on this collection's listing/archive routes. Omit to use `cms/pagination`'s `DEFAULT_PAGE_SIZE`. */
  pageSize?: number;
  /** Returns every item, drafts included — CollectionService applies the draft filter itself. */
  fetchEdges: () => Promise<Array<Edge<unknown>> | null | undefined>;
  /** Single-document fetch by relativePath — the raw `{data, query, variables}` shape `useTina()` needs. */
  fetchBySlug: (relativePath: string) => Promise<unknown>;
  /** Field name marking a draft item, e.g. "draft". Omit if this collection has no draft concept. */
  draftFieldName?: string;
  /** Optional override for the SEO dashboard's per-document index; when omitted,
   * getSeoIndex() falls back to reading `.seo`/`.slug` off fetchEdges()'s own results. */
  fetchSeoIndex?: () => Promise<Array<Edge<unknown>> | null | undefined>;
};

export type { Paginated };
