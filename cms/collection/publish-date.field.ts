import type { TinaField } from "tinacms";

/** When this document went live — editor-chosen and required, so every
 * content item has a real freshness signal (sitemap `lastModified`,
 * listing sort order, ...) instead of an optional afterthought. Pairs
 * with `modifiedDateField()`, which is auto-managed rather than
 * editor-set. */
export function publishDateField(): TinaField {
  return {
    type: "datetime",
    name: "publishDate",
    label: "Publish Date",
    required: true,
  } as TinaField;
}
