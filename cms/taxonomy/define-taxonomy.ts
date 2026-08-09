import type { Collection } from "tinacms";
import { slugField, slugLifecycleGuard } from "@/cms/slug";
import { composeBeforeSubmit } from "@/cms/tina-hooks";
import { seoField } from "@/cms/seo";

/**
 * Registers a taxonomy: a standalone term-store collection (title + slug +
 * SEO), the same shape WordPress gives each taxonomy its own term table.
 * Call once per taxonomy ("categories", "countries", ...), add the result
 * to the `collections` array in tina/config.ts, and it shows up as its own
 * independently-manageable term list in the admin — editors add/rename
 * terms there with no schema change or redeploy.
 *
 * `seoField()` is included because a term's archive page (e.g.
 * `/blog/category/news`) is a real, individually-visited, indexable URL —
 * same reasoning as every other page-representing collection — even though
 * a taxonomy term isn't itself a `ContentCollection` member (see
 * cms/create-project.ts's `ContentCollection` doc comment: "has SEO" and
 * "is a ContentCollection" are different, overlapping traits).
 */
export function defineTaxonomy(options: { name: string; label: string; path?: string }): Collection {
  const { name, label, path } = options;
  return {
    name,
    label,
    path: path ?? `content/${name}`,
    format: "md",
    ui: {
      beforeSubmit: composeBeforeSubmit([slugLifecycleGuard(name)]),
    },
    fields: [
      { type: "string", name: "title", label: "Title", required: true },
      slugField(),
      seoField(),
    ],
  };
}
