import type { BeforeSubmitArgs, BeforeSubmitHook } from "@/cms/tina-hooks";

/**
 * A `BeforeSubmitHook` (compose with others via `composeBeforeSubmit` from
 * `@/cms/tina-hooks`) for any collection with a `slugField()`:
 *
 * 1. **Uniqueness** — blocks saving a document whose `slug` is already used
 *    by another document in the same collection and locale.
 * 2. **Lock** — if `options.lockedFilenames` is given and the document's
 *    filename is in that set, changing `slug` is rejected outright. A
 *    project supplies this set for whichever collection/filenames have a
 *    slug that isn't really an editorial choice (e.g. this repo's `pages`
 *    collection locks `home` and every registered collection's listing
 *    page — see `lib/pages-config.ts`); `cms/slug` itself has no idea what
 *    those filenames are, that's entirely caller-supplied. The on-disk slug
 *    is only fetched for this check, and only when `lockedFilenames` is
 *    non-empty — everything else skips straight to the uniqueness check.
 *
 * Deliberately does *not* track slug history or redirect old URLs — a
 * renamed slug is rare enough that a developer adding a manual redirect
 * when it happens is simpler than an editor-invisible auto-managed field.
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
export function slugLifecycleGuard(
  collectionName: string,
  options?: { lockedFilenames?: Set<string> }
): BeforeSubmitHook {
  return async ({ values, cms, form }: BeforeSubmitArgs) => {
    const slug = values.slug;
    if (!slug || typeof slug !== "string") return;

    if (options?.lockedFilenames?.size) {
      const filename = form.path.split("/").pop()?.replace(/\.md$/, "");
      if (filename && options.lockedFilenames.has(filename)) {
        try {
          const res = await cms.api.tina.request(
            `query($path: String!) { ${collectionName}(relativePath: $path) { slug } }`,
            { variables: { path: form.path } }
          );
          const onDiskSlug = (res?.data?.[collectionName] as { slug?: string } | undefined)?.slug;
          if (onDiskSlug && onDiskSlug !== slug) {
            throw new Error(
              `The slug for "${filename}" is locked and can't be changed here — its public URL is controlled in code, not this field.`
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
      (res?.data?.[connectionField] as { edges?: typeof edges })?.edges || [];

    const collision = edges.some(
      (edge) =>
        edge.node._sys.breadcrumbs[0] === locale && edge.node._sys.relativePath !== form.path
    );

    if (collision) {
      throw new Error(`A document with slug "${slug}" already exists for this locale.`);
    }
  };
}
