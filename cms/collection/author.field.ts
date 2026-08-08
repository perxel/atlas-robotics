import type { TinaField } from "tinacms";

/** Byline for content collections that have one — pass `hasAuthor: false`
 * in `defineContentCollection()` to omit it for collections without a
 * human author (e.g. products). */
export function authorField(): TinaField {
  return {
    type: "string",
    name: "author",
    label: "Author",
  } as TinaField;
}
