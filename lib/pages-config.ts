import { sectionSlugs } from "@/lib/section-slugs";

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
 *
 * `reservedSlugs` is a single flat set applied to every `pages` document
 * regardless of its own locale, so every locale's spelling of a section
 * (see lib/section-slugs.ts — e.g. "blog" AND "tin-tuc") is reserved
 * everywhere, not just for the locale it belongs to. A little
 * conservative, but simple and safe — an English page can't be named
 * "tin-tuc" either, which costs nothing.
 */
export const reservedSlugs = new Set<string>([
  ...Object.values(sectionSlugs).flatMap((byLocale) => Object.values(byLocale)),
  "admin",
  "api",
]);
