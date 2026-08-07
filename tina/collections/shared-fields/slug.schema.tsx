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
 *    segment is owned by `lib/collection-slugs.ts`, not this field. The
 *    on-disk slug is only fetched for this check, and only for a locked
 *    filename — everything else skips straight to the uniqueness check.
 *
 * Deliberately does *not* track slug history or redirect old URLs — a
 * renamed slug is rare enough that a developer adding a manual redirect
 * when it happens is simpler than an editor-invisible auto-managed field
 * (an earlier version of this guard did exactly that; removed because it
 * showed up as a confusing "Previous Slugs (auto-managed)" list field in
 * the admin with no way to hide it cleanly, for a case that doesn't come
 * up often enough to justify the complexity).
 *
 * Runs client-side inside Tina's admin form submit flow (verified against
 * tinacms/dist/index.js: `beforeSubmit` is awaited inside `handleSubmit`'s
 * try/catch, and throwing here prevents the write from ever reaching disk
 * — Tina shows the thrown message as a form error).
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

    if (collectionName === "pages") {
      const filename = form.path.split("/").pop()?.replace(/\.md$/, "");
      if (filename && lockedSlugFilenames.has(filename)) {
        try {
          const res = await cms.api.tina.request(
            `query($path: String!) { pages(relativePath: $path) { slug } }`,
            { variables: { path: form.path } }
          );
          const onDiskSlug: string | undefined = res?.data?.pages?.slug;
          if (onDiskSlug && onDiskSlug !== slug) {
            throw new Error(
              `The slug for "${filename}" is locked and can't be changed here — its public URL is controlled in code (lib/collection-slugs.ts, or the "home" special case), not this field.`
            );
          }
        } catch (err) {
          // Re-throw the lock error above; swallow anything else (e.g. a
          // brand-new document with nothing on disk yet to compare against).
          if (err instanceof Error && err.message.startsWith('The slug for "')) throw err;
        }
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
