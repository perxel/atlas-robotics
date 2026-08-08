import type { Collection } from "tinacms";
import { slugField, slugLifecycleGuard } from "@/cms/slug";
import { composeBeforeSubmit } from "@/cms/tina-hooks";

/**
 * Registers a taxonomy: a standalone term-store collection (title + slug),
 * the same shape WordPress gives each taxonomy its own term table. Call
 * once per taxonomy ("categories", "countries", ...), add the result to the
 * `collections` array in tina/config.ts, and it shows up as its own
 * independently-manageable term list in the admin — editors add/rename
 * terms there with no schema change or redeploy.
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
    ],
  };
}
