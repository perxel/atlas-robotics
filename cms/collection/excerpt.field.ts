import type { TinaField } from "tinacms";

/**
 * Short teaser shown on cards/listings — also the natural fallback source
 * for `seo.metaDescription` when an editor hasn't written a distinct
 * search-result blurb (see each route's `fallbackDescription` in
 * `CMSSeo.buildMetadata()` calls). Deliberately not merged *into*
 * `seo.metaDescription` the way `coverImage` was merged into `seo.ogImage`:
 * unlike the image case, this project's own seed content has real,
 * independently-written text in both fields for every document — treating
 * them as one field would destroy that, not just dedupe a redundant one.
 */
export function excerptField(): TinaField {
  return {
    type: "string",
    name: "excerpt",
    label: "Excerpt",
    ui: { component: "textarea" },
  } as TinaField;
}
