import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import {
  type Locale,
  CMSDictionary,
  getMultilingualSettings,
  getNav,
  getSiteSettings,
  resolveLocaleAlternates,
  resolveNavLinks,
} from "@/lib/cms-server";
import { CMSMultilingual } from "@/lib/registry";
import { translateText } from "@/cms/multilingual";
import LanguageSwitcher from "./LanguageSwitcher";
import NavMenu from "./NavMenu";

export default async function Header({ locale }: { locale: Locale }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || CMSMultilingual.localePath(locale, "/");
  const [navDoc, settings, alternates, multilingual, uiDictionary] = await Promise.all([
    getNav(),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    getMultilingualSettings(),
    CMSDictionary.loadMap(locale),
  ]);
  const links = await resolveNavLinks(navDoc, locale);
  const t = (text: string) => translateText(uiDictionary, text);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex my-container items-center justify-between gap-4 px-4 py-3">
        <Link
          href={CMSMultilingual.localePath(locale, "/")}
          className="flex items-center gap-2 text-lg font-semibold whitespace-nowrap"
        >
          {settings?.logo && (
            <Image
              src={settings.logo}
              alt={settings.logoAlt || ""}
              width={32}
              height={32}
              className="h-8 w-8 rounded object-cover"
            />
          )}
          {settings?.title || t("Lorem ipsum")}
        </Link>

        <NavMenu
          links={links}
          uiDictionary={uiDictionary}
          languageSwitcher={<LanguageSwitcher currentLocale={locale} urls={alternates} config={multilingual?.switcher} />}
        />

        <div className="hidden md:block">
          <LanguageSwitcher currentLocale={locale} urls={alternates} config={multilingual?.switcher} />
        </div>
      </div>
    </header>
  );
}
