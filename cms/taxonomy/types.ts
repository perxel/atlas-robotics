import type { Edge, Paginated } from "@/cms/collection";
import type { SeoFields } from "@/cms/seo";

export type TermDoc = {
  title: string;
  slug: string;
  seo?: SeoFields;
  _sys: { relativePath: string; breadcrumbs: string[] };
};

export type TaxonomyRegistryEntry<TCollectionName extends string, TLocale extends string> = {
  /** English source label, e.g. "Product Categories" — same role as
   * CollectionRegistryEntry.label, kept as a separate field because a
   * taxonomy isn't a CollectionService registry entry. */
  label: string;
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
