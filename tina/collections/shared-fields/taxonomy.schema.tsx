import type { Collection, TinaField } from "tinacms";
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

/**
 * Attaches a taxonomy (see `defineTaxonomy`) to a content collection.
 *
 * `multiple` (default `true`) controls the field shape, not just a UI
 * preference — Tina's `reference` field type does not support `list: true`
 * itself: the GraphQL schema builder accepts it (`@tinacms/graphql`,
 * `_buildDataField`), but emits `console.warn("the user interface for
 * reference does not support \`list: true\`")` because the admin has no
 * multi-select widget for it. So a real multi-term taxonomy is modeled the
 * same way every other repeatable field in this schema already is
 * (`socialLinks`, `attributes`, footer `columns`): a `list: true` object,
 * one repeatable item per term, each item holding a single (non-list)
 * `reference`. That's why `post.categories` (multiple: true) is
 * `{ term: Category }[]`, not `Category[]` directly — unwrap with
 * `.map(c => c.term)` on the frontend.
 *
 * Pass `multiple: false` for a taxonomy that's genuinely single-select for
 * this collection — that case has no such limitation and stays a plain
 * `reference` field.
 */
export function taxonomyField(options: {
  taxonomy: string;
  name?: string;
  label: string;
  multiple?: boolean;
}): TinaField {
  const { taxonomy, name = taxonomy, label, multiple = true } = options;

  if (!multiple) {
    return {
      type: "reference",
      name,
      label,
      collections: [taxonomy],
    } as TinaField;
  }

  return {
    type: "object",
    name,
    label,
    list: true,
    ui: {
      // `item.term` is the raw reference value (a document path like
      // "content/categories/en/news.md") — itemProps only sees form
      // values, not resolved query data, so the referenced document's
      // title isn't available here. Falling back to the filename keeps
      // the collapsed list item readable instead of showing the full path.
      itemProps: (item: { term?: string }) => ({
        label: item?.term?.split("/").pop()?.replace(/\.md$/, "") || label,
      }),
    },
    fields: [
      {
        type: "reference",
        name: "term",
        label,
        collections: [taxonomy],
      },
    ],
  } as TinaField;
}
