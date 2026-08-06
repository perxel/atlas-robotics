import type { TinaField } from "tinacms";

/**
 * Standard draft flag: unpublishes a document from the public site without
 * deleting it. Not treated specially by Tina — application query code is
 * responsible for filtering it out (see lib/tina-content.ts).
 * https://tina.io/docs/drafts/drafts-fields
 */
export function draftField(): TinaField {
  return {
    type: "boolean",
    name: "draft",
    label: "Draft",
    description: "If checked, this item is hidden from the public site without deleting it.",
  } as TinaField;
}
