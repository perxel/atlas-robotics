import Link from "next/link";
import { locales, localePath, type Locale } from "@/lib/i18n";

export default function LanguageSwitcher({
  currentLocale,
  urls,
}: {
  currentLocale: Locale;
  /** From Header.tsx's resolveLocaleAlternates (lib/locale-alternates.ts) —
   * a real per-locale URL, not a guess. A locale missing from this map
   * (translation not found) falls back to that locale's homepage rather
   * than linking to a URL that might not exist. */
  urls: Partial<Record<Locale, string>>;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={urls[locale] ?? localePath(locale, "/")}
          hrefLang={locale}
          aria-current={locale === currentLocale ? "true" : undefined}
          className={
            locale === currentLocale
              ? "font-semibold text-accent"
              : "text-muted-foreground hover:text-foreground"
          }
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
