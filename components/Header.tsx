import Link from "next/link";
import { headers } from "next/headers";
import { type Locale, CMSDictionary, getMultilingualSettings, getNav, getSiteSettings, resolveLocaleAlternates } from "@/lib/cms-server";
import { CMSMultilingual } from "@/lib/registry";
import { translateText } from "@/cms/multilingual";
import LanguageSwitcher from "./LanguageSwitcher";

export default async function Header({ locale }: { locale: Locale }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || CMSMultilingual.localePath(locale, "/");
  const [nav, settings, alternates, multilingual, uiDictionary] = await Promise.all([
    getNav(locale),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    getMultilingualSettings(),
    CMSDictionary.loadMap(locale),
  ]);
  const t = (text: string) => translateText(uiDictionary, text);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex my-container items-center justify-between gap-4 px-4 py-3">
        <Link
          href={CMSMultilingual.localePath(locale, "/")}
          className="flex items-center gap-2 text-lg font-semibold whitespace-nowrap"
        >
          {settings?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo} alt={settings.logoAlt || ""} className="h-8 w-8 rounded" />
          )}
          {settings?.title || t("Lorem ipsum")}
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex" aria-label={t("Primary")}>
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

        <LanguageSwitcher currentLocale={locale} urls={alternates} config={multilingual?.switcher} />
      </div>
    </header>
  );
}
