import type { TinaField } from "tinacms";

/**
 * Standard routable slug field. Pair with `slugUniquenessGuard()` on the
 * same collection's `ui.beforeSubmit` — enforced automatically, see the
 * schema-shape check at the bottom of tina/config.ts.
 */
export function slugField(options?: { reserved?: Set<string> }): TinaField {
  const reserved = options?.reserved;
  return {
    type: "string",
    name: "slug",
    label: "Slug",
    required: true,
    ui: reserved
      ? {
          validate: (value) => {
            if (value && reserved.has(value)) {
              return `"${value}" is reserved for a built-in page and can't be used here.`;
            }
          },
        }
      : undefined,
  } as TinaField;
}

/**
 * Blocks saving a document whose `slug` is already used by another document
 * in the same collection and locale. Runs client-side inside Tina's admin
 * form submit flow (verified against tinacms/dist/index.js: `beforeSubmit`
 * is awaited inside handleSubmit's try/catch, and throwing here prevents
 * the write from ever reaching disk — Tina shows the thrown message as a
 * form error).
 *
 * Important: this only protects saves made through the Tina admin UI. A
 * document created directly via a GraphQL mutation (e.g. a seed script)
 * bypasses this entirely, the same way an ORM-level unique constraint
 * doesn't help if something writes to the database directly.
 */
export function slugUniquenessGuard(collectionName: string) {
  return async ({
    values,
    cms,
    form,
  }: {
    values: Record<string, unknown>;
    cms: { api: { tina: { request: (query: string, opts: { variables: Record<string, unknown> }) => Promise<any> } } };
    form: { path: string };
  }) => {
    const slug = values.slug;
    if (!slug || typeof slug !== "string") return;

    const connectionField = `${collectionName}Connection`;
    const res = await cms.api.tina.request(
      `query($slug: String!) { ${connectionField}(filter: { slug: { eq: $slug } }) { edges { node { ... on Document { _sys { relativePath breadcrumbs } } } } } }`,
      { variables: { slug } }
    );

    const locale = form.path.split("/")[0];
    const edges: { node: { _sys: { relativePath: string; breadcrumbs: string[] } } }[] =
      res?.data?.[connectionField]?.edges || [];

    const collision = edges.some(
      (edge) =>
        edge.node._sys.breadcrumbs[0] === locale && edge.node._sys.relativePath !== form.path
    );

    if (collision) {
      throw new Error(`A document with slug "${slug}" already exists for this locale.`);
    }
  };
}

/**
 * The gate: any collection with a `slug` field must also define
 * `ui.beforeSubmit` (expected to be `slugUniquenessGuard(...)`), or this
 * throws — failing `tinacms dev`/`build` immediately rather than shipping a
 * collection where duplicate slugs can silently make a document
 * unreachable. Call this once, on the full collections array, in
 * tina/config.ts.
 */
export function assertSlugFieldsHaveGuard(
  collections: { name: string; fields?: { name: string }[]; ui?: { beforeSubmit?: unknown } }[]
) {
  const offenders = collections
    .filter((c) => c.fields?.some((f) => f.name === "slug") && !c.ui?.beforeSubmit)
    .map((c) => c.name);

  if (offenders.length > 0) {
    throw new Error(
      `Collection(s) [${offenders.join(", ")}] have a "slug" field but no ui.beforeSubmit. ` +
        `Add "beforeSubmit: slugUniquenessGuard(collectionName)" — see tina/collections/shared-fields/slug.schema.tsx.`
    );
  }
}
