import Link from "next/link";
import { headers } from "next/headers";
import { getNav, getSiteSettings } from "@/lib/tina-content";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import LanguageSwitcher from "./LanguageSwitcher";

export default async function Header({ locale }: { locale: Locale }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/");
  const [nav, settings, alternates] = await Promise.all([
    getNav(locale),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
  ]);
  const dict = getDictionary(locale);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={localePath(locale, "/")}
          className="flex items-center gap-2 text-lg font-semibold whitespace-nowrap"
        >
          {settings?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo} alt="" className="h-8 w-8 rounded" />
          )}
          {settings?.title || dict.siteName}
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex" aria-label={dict.nav.primary}>
          {nav?.links?.map(
            (link, i) =>
              link && (
                <Link
                  key={i}
                  href={link.url || "#"}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  className="text-foreground/80 hover:text-foreground"
                >
                  {link.label}
                </Link>
              )
          )}
        </nav>

        <LanguageSwitcher currentLocale={locale} urls={alternates} />
      </div>
    </header>
  );
}
