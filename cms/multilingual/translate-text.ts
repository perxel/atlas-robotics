/**
 * WordPress-style lookup: `sourceText` itself is the key. An entry missing
 * for this locale (untranslated, or the locale is the default and never
 * had a separate value to begin with) just falls back to the source text
 * — matches WordPress's own `__()` behavior, no key-naming discipline
 * needed, every string works the moment it's written in code.
 *
 * Deliberately takes a plain `Record<string, string>` snapshot rather than
 * a bound closure: a closure can't safely cross a Server → Client Component
 * prop boundary (functions aren't serializable), while a resolved map can
 * — so components that render inside a client-rendered subtree (anything
 * under a visual-editing `useTina()` boundary) can still translate text
 * from data threaded down as a normal prop.
 */
export function translateText(dictionary: Record<string, string>, sourceText: string): string {
  return dictionary[sourceText] ?? sourceText;
}
