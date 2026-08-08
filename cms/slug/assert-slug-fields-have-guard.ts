/**
 * The gate: any collection with a `slug` field must also define
 * `ui.beforeSubmit` (expected to be `composeBeforeSubmit([slugLifecycleGuard(...), ...])`),
 * or this throws — failing `tinacms dev`/`build` immediately rather than
 * shipping a collection where duplicate slugs can silently make a document
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
        `Add "beforeSubmit: composeBeforeSubmit([slugLifecycleGuard(collectionName)])" — see cms/slug/slug-lifecycle-guard.ts.`
    );
  }
}
