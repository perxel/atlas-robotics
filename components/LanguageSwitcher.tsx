"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localePath, stripLocalePrefix, type Locale } from "@/lib/i18n";

export default function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const pathname = usePathname() || "/";
  const rest = stripLocalePrefix(pathname);

  return (
    <div className="flex items-center gap-2 text-sm">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={localePath(locale, rest)}
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
