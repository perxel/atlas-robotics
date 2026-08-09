"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
// From lib/registry.ts, not lib/cms-server.ts — this is a client component,
// and lib/cms-server.ts drags in the generated Tina client, which has no
// business in a client bundle. Same reasoning as middleware.ts's import.
import { localeLabels, CMSMultilingual, type Locale } from "@/lib/registry";
import type { SwitcherConfigItem } from "@/cms/multilingual";

export default function LanguageSwitcher({
  currentLocale,
  urls: initialUrls,
  config,
}: {
  currentLocale: Locale;
  /** From Header.tsx's resolveLocaleAlternates (cms/locale-alternates) —
   * a real per-locale URL, not a guess. A locale missing from this map has
   * no translation for the current content (verified via a real cross-locale
   * document lookup, not assumed) and is hidden from the switcher entirely
   * rather than linking to a URL that might not exist. Used as the initial
   * (SSR) value only — see the effect below for why it can't stay the only
   * source. */
  urls: Partial<Record<Locale, string>>;
  /** The `multilingual` document's `switcher` field — editor-controlled
   * display order, label text, and an optional flag image. Only affects
   * how the switcher looks; it never changes which locales exist or which
   * URL each one links to (that's still CMSMultilingual + `urls` above). A
   * locale missing from this list — including an empty/unconfigured list —
   * falls back to lib/locale.ts's `localeLabels`, so the switcher always
   * shows every enabled locale even before an editor touches this field. */
  config?: SwitcherConfigItem[] | null;
}) {
  const pathname = usePathname();
  const [urls, setUrls] = useState(initialUrls);

  useEffect(() => {
    // Header (and this component's initial `urls` prop) is rendered inside
    // app/[locale]/layout.tsx, which Next.js's App Router intentionally
    // does NOT re-render on a client-side navigation to a sibling route
    // under the same locale segment (e.g. /products -> /products/x) —
    // shared layouts persist across navigations by design. That leaves
    // `urls` stuck on whatever page first rendered the layout, so a
    // product with fewer translations than the page you navigated from
    // still shows the old page's full locale list until a hard reload.
    // `pathname` (from next/navigation) DOES update on every client
    // navigation, so re-resolving alternates keyed on it — via a real
    // request, since this needs a fresh cross-locale document lookup, not
    // just string math — is what keeps the switcher in sync without one.
    let cancelled = false;
    fetch(`/api/locale-alternates?locale=${currentLocale}&pathname=${encodeURIComponent(pathname)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.urls) setUrls(data.urls);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, currentLocale]);

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
            <Image src={flag} alt="" width={20} height={14} className="h-3.5 w-5 rounded-sm object-cover" />
          )}
          {label}
        </Link>
      ))}
    </div>
  );
}
