import type { Edge, Paginated } from "@/cms/collection";

export type TermDoc = {
  title: string;
  slug: string;
  _sys: { relativePath: string; breadcrumbs: string[] };
};

export type TaxonomyRegistryEntry<TCollectionName extends string, TLocale extends string> = {
  fetchTerms: () => Promise<Array<Edge<TermDoc>> | null | undefined>;
  attachments: Partial<
    Record<
      TCollectionName,
      {
        fieldName: string;
        urlSegment: Record<TLocale, string>;
      }
    >
  >;
};

export type { Edge, Paginated };
