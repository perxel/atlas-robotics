import Link from "next/link";
import { locales, localeLabels, isLocale, localePath, type Locale } from "@/lib/i18n";

export type LanguageSwitcherConfigItem = {
  locale?: string | null;
  label?: string | null;
  flag?: string | null;
} | null;

export default function LanguageSwitcher({
  currentLocale,
  urls,
  config,
}: {
  currentLocale: Locale;
  /** From Header.tsx's resolveLocaleAlternates (lib/locale-alternates.ts) —
   * a real per-locale URL, not a guess. A locale missing from this map has
   * no translation for the current content (verified via a real cross-locale
   * document lookup, not assumed) and is hidden from the switcher entirely
   * rather than linking to a URL that might not exist. */
  urls: Partial<Record<Locale, string>>;
  /** Site settings' `languageSwitcher` field — editor-controlled display
   * order, label text, and an optional flag image. Only affects how the
   * switcher looks; it never changes which locales exist or which URL
   * each one links to (that's still lib/i18n.ts + `urls` above). A locale
   * missing from this list — including an empty/unconfigured list — falls
   * back to lib/i18n.ts's `localeLabels`, appended in `locales` order, so
   * the switcher always shows every locale even before an editor touches
   * this field. */
  config?: LanguageSwitcherConfigItem[] | null;
}) {
  const seen = new Set<Locale>();
  const entries: { locale: Locale; label: string; flag?: string | null }[] = [];

  for (const item of config ?? []) {
    if (!item?.locale || !isLocale(item.locale) || seen.has(item.locale)) continue;
    seen.add(item.locale);
    entries.push({ locale: item.locale, label: item.label || localeLabels[item.locale], flag: item.flag });
  }
  for (const locale of locales) {
    if (seen.has(locale)) continue;
    entries.push({ locale, label: localeLabels[locale] });
  }

  // Only show a locale this content actually has a translation for. The
  // current locale always shows (it's the page you're on, even if for some
  // reason it's missing from `urls`); every other locale needs a real entry
  // in `urls` — a locale resolveLocaleAlternates found no sibling document
  // for has nothing to link to.
  const available = entries.filter(({ locale }) => locale === currentLocale || urls[locale]);

  return (
    <div className="flex items-center gap-3 text-sm">
      {available.map(({ locale, label, flag }) => (
        <Link
          key={locale}
          href={urls[locale] ?? localePath(locale, "/")}
          hrefLang={locale}
          aria-current={locale === currentLocale ? "true" : undefined}
          className={
            "flex items-center gap-1.5 " +
            (locale === currentLocale
              ? "font-semibold text-accent"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {flag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flag} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
          )}
          {label}
        </Link>
      ))}
    </div>
  );
}
