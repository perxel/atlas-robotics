/**
 * Pages listed here render as a fixed layout (title + intro only), ignoring
 * whatever sections editors have added in the admin. The `pages` collection
 * schema always supports block editing (tina/config.ts) — this is a
 * developer-only, per-page override in code, not something editors can
 * toggle themselves.
 */
export const blocksDisabledSlugs = new Set<string>([
  // "home",
]);

export function isBlocksEnabled(slug: string): boolean {
  return !blocksDisabledSlugs.has(slug);
}

/**
 * The `pages` collection resolves at the root of each locale (e.g. `/about`,
 * see app/[locale]/[slug]/page.tsx), so a page can't reuse a slug that a
 * dedicated route already owns — Next.js would resolve to the dedicated
 * route silently (literal segments win over the dynamic sibling), leaving
 * the page unreachable rather than erroring. Enforced in the Tina schema
 * itself via the `slug` field's `ui.validate` (tina/config.ts).
 */
export const reservedSlugs = new Set<string>([
  "blog",
  "catalog",
  "story-cards",
  "contact",
  "admin",
  "api",
]);
