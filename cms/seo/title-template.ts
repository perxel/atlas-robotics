/**
 * Generic Yoast-style title templating: an ordered list of named tokens
 * (restricted to whatever union a project defines — an unknown token name
 * is a compile error, not a silent typo) plus a `{ text }` escape hatch for
 * custom copy that isn't backed by any CMS field. Deliberately owns none of
 * a project's actual token names, shape arrays, or separator — those are
 * project data (see lib/registry.ts), not framework logic.
 */
export type TitlePart<TToken extends string> = TToken | { text: string };

/**
 * Resolves a title shape into a string. `values[token]` supplies each named
 * token; a `{ text }` part is run through `t()` instead, so custom literal
 * copy (e.g. "Archive for") is translated the same way every other UI
 * string in a project already is — no separate i18n path needed for it.
 * A falsy resolved value (a missing pageTitle, an untranslated empty
 * string) just drops out rather than leaving a dangling separator.
 */
export function resolveTitleTemplate<TToken extends string>(
  shape: TitlePart<TToken>[],
  values: Partial<Record<TToken, string | null | undefined>>,
  t: (text: string) => string,
  sep: string
): string {
  return shape
    .map((part) => (typeof part === "string" ? values[part] : t(part.text)))
    .filter((v): v is string => !!v)
    .join(` ${sep} `);
}
