import type { TinaField } from "tinacms";
import type { BeforeSubmitHook } from "../tina-hooks";

/**
 * Standard draft flag: unpublishes a document from the public site without
 * deleting it. Not treated specially by Tina — application query code
 * (CollectionService's `includeDrafts` filtering) is responsible for
 * filtering it out. https://tina.io/docs/drafts/drafts-fields
 */
export function draftField(): TinaField {
  return {
    type: "boolean",
    name: "draft",
    label: "Draft",
    description: "If checked, this item is hidden from the public site without deleting it.",
  } as TinaField;
}

/**
 * Stamps `draft: false` on first save if the field is still unset. A
 * boolean field the editor never touches is written to the file as
 * genuinely absent, not `false` — and every `*Connection` query in
 * lib/cms-server.ts filters with `draft: { eq: false } }`, which does not
 * match an absent/null field (confirmed live against the local Tina
 * GraphQL server: a document saved with `draft` untouched came back
 * `draft: null` and `pagesConnection(filter: { draft: { eq: false } })`
 * silently excluded it — a real page, 404ing with no error anywhere,
 * because its `draft` key was never written). Seed content sidesteps this
 * by setting `draft: false` explicitly by hand; this hook makes any
 * document created through the admin do the same automatically. Only
 * fills the gap, never overrides an editor's actual choice.
 */
export const defaultDraftToFalse: BeforeSubmitHook = async (args) => {
  if (args.values.draft !== undefined && args.values.draft !== null) return;
  return { ...args.values, draft: false };
};
