import type { TinaField } from "tinacms";
import { lockedSlugFilenames } from "@/lib/pages-config";

/**
 * Standard routable slug field. Pair with `slugLifecycleGuard()` on the
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
 * Pairs with `slugField()` — a history of every previous value of `slug`,
 * maintained automatically by `slugLifecycleGuard` (never hand-edited by an
 * editor). Lets a changed slug 404 gracefully into a redirect instead of a
 * dead link: lib/tina-content.ts's fallback lookups check this when the
 * current slug doesn't match anything.
 */
export function previousSlugsField(): TinaField {
  return {
    type: "string",
    name: "previousSlugs",
    label: "Previous Slugs (auto-managed)",
    list: true,
    description:
      "Automatically maintained — every prior value of Slug is appended here when it changes, so old URLs redirect to the current one instead of 404ing. Don't edit by hand.",
  } as TinaField;
}

type BeforeSubmitArgs = {
  values: Record<string, unknown>;
  cms: {
    api: {
      tina: {
        request: (
          query: string,
          opts: { variables: Record<string, unknown> }
        ) => Promise<{ data?: Record<string, any> }>;
      };
    };
  };
  form: { path: string };
};

/**
 * Combined `ui.beforeSubmit` guard for any collection with a `slugField()`:
 *
 * 1. **Uniqueness** — blocks saving a document whose `slug` is already used
 *    by another document in the same collection and locale (unchanged from
 *    the original `slugUniquenessGuard`).
 * 2. **Lock** — for the `pages` collection only, if the document's filename
 *    is in `lockedSlugFilenames` (lib/pages-config.ts — `home` and every
 *    registered collection's listing page), changing `slug` is rejected
 *    outright. Those slugs aren't a real editorial choice: `home` is
 *    resolved by a hardcoded key, and a listing page's real public URL
 *    segment is owned by `lib/collection-slugs.ts`, not this field.
 * 3. **History** — otherwise, when `slug` changes, the previous value is
 *    appended to `previousSlugsField()` automatically, so old URLs can
 *    redirect instead of 404ing (see lib/tina-content.ts).
 *
 * Runs client-side inside Tina's admin form submit flow (verified against
 * tinacms/dist/index.js: `beforeSubmit` is awaited inside `handleSubmit`'s
 * try/catch, and throwing here prevents the write from ever reaching disk
 * — Tina shows the thrown message as a form error). Important: Tina only
 * uses this hook's *return value* (`valOverride`) to decide what gets
 * saved — `handleSubmit` does `submittedValues = valOverride || values`,
 * so mutating `values` in place and returning nothing is silently a no-op.
 * Confirmed directly in that file, not assumed. Every branch below either
 * throws or returns a full values object for that reason.
 *
 * Important: this only protects saves made through the Tina admin UI. A
 * document created directly via a GraphQL mutation (e.g. a seed script)
 * bypasses this entirely, the same way an ORM-level unique constraint
 * doesn't help if something writes to the database directly.
 */
export function slugLifecycleGuard(collectionName: string) {
  return async ({ values, cms, form }: BeforeSubmitArgs) => {
    const slug = values.slug;
    if (!slug || typeof slug !== "string") return;

    // The slug currently on disk for this exact document, if any — a brand
    // new document has nothing saved yet, so this naturally no-ops below.
    let previousSlug: string | undefined;
    try {
      const res = await cms.api.tina.request(
        `query($path: String!) { ${collectionName}(relativePath: $path) { slug } }`,
        { variables: { path: form.path } }
      );
      previousSlug = res?.data?.[collectionName]?.slug;
    } catch {
      previousSlug = undefined;
    }

    let nextValues = values;

    if (previousSlug && previousSlug !== slug) {
      if (collectionName === "pages") {
        const filename = form.path.split("/").pop()?.replace(/\.md$/, "");
        if (filename && lockedSlugFilenames.has(filename)) {
          throw new Error(
            `The slug for "${filename}" is locked and can't be changed here — its public URL is controlled in code (lib/collection-slugs.ts, or the "home" special case), not this field.`
          );
        }
      }

      const existing = Array.isArray(values.previousSlugs)
        ? (values.previousSlugs as string[])
        : [];
      if (!existing.includes(previousSlug)) {
        nextValues = { ...values, previousSlugs: [...existing, previousSlug] };
      }
    }

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

    return nextValues === values ? undefined : nextValues;
  };
}

/**
 * The gate: any collection with a `slug` field must also define
 * `ui.beforeSubmit` (expected to be `slugLifecycleGuard(...)`), or this
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
        `Add "beforeSubmit: slugLifecycleGuard(collectionName)" — see tina/collections/shared-fields/slug.schema.tsx.`
    );
  }
}
