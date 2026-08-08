import Link from "next/link";
import { localeLabels, CMSMultilingual, type Locale } from "@/lib/cms";
import type { SwitcherConfigItem } from "@/cms/multilingual";

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
  /** The `multilingual` document's `switcher` field — editor-controlled
   * display order, label text, and an optional flag image. Only affects
   * how the switcher looks; it never changes which locales exist or which
   * URL each one links to (that's still CMSMultilingual + `urls` above). A
   * locale missing from this list — including an empty/unconfigured list —
   * falls back to lib/i18n.ts's `localeLabels`, so the switcher always
   * shows every enabled locale even before an editor touches this field. */
  config?: SwitcherConfigItem[] | null;
}) {
  const entries = CMSMultilingual.resolveSwitcherEntries({
    currentLocale,
    urls,
    labels: localeLabels,
    config,
  });

  return (
    <div className="flex items-center gap-3 text-sm">
      {entries.map(({ locale, label, flag, href, isCurrent }) => (
        <Link
          key={locale}
          href={href}
          hrefLang={locale}
          aria-current={isCurrent ? "true" : undefined}
          className={
            "flex items-center gap-1.5 " +
            (isCurrent ? "font-semibold text-accent" : "text-muted-foreground hover:text-foreground")
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
