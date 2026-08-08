import type { SwitcherConfigItem, SwitcherEntry } from "./types";
import { resolveSwitcherEntries } from "./internal/resolve-switcher-entries";

/**
 * Locale routing + enable/disable + language-switcher data. See
 * .claude/plans/03-multilingual.md.
 *
 * "Disable a locale" never touches its content — every document in that
 * locale stays exactly as-is and is still directly editable in Tina.
 * Disabling only removes it from discovery surfaces: this service's own
 * `getEnabledLocales()`/`isLocaleEnabled()`, which every public-facing
 * surface (sitemap, hreflang, switcher, dashboards) should read instead of
 * `getAllLocales()` directly.
 */
export class MultilingualService<TLocale extends string> {
  #locales: readonly TLocale[];
  #defaultLocale: TLocale;
  #enabledLocales: readonly TLocale[];
  #enabled: boolean;

  constructor(config: {
    locales: readonly TLocale[];
    defaultLocale: TLocale;
    enabledLocales?: readonly TLocale[];
    enabled?: boolean;
  }) {
    this.#locales = config.locales;
    this.#defaultLocale = config.defaultLocale;
    this.#enabledLocales = config.enabledLocales ?? config.locales;
    this.#enabled = config.enabled ?? this.#enabledLocales.length > 1;
  }

  isLocale(value: string): value is TLocale {
    return (this.#locales as readonly string[]).includes(value);
  }

  pathnameHasLocalePrefix(pathname: string): boolean {
    return this.#locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  }

  stripLocalePrefix(pathname: string): string {
    for (const l of this.#locales) {
      if (pathname === `/${l}`) return "/";
      if (pathname.startsWith(`/${l}/`)) return pathname.slice(`/${l}`.length);
    }
    return pathname;
  }

  localePath(locale: TLocale, pathWithoutLocale: string): string {
    const clean = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
    return locale === this.#defaultLocale ? clean || "/" : `/${locale}${clean}`;
  }

  isEnabled(): boolean {
    return this.#enabled;
  }

  getAllLocales(): readonly TLocale[] {
    return this.#locales;
  }

  getEnabledLocales(): readonly TLocale[] {
    return this.#enabledLocales;
  }

  isLocaleEnabled(lang: TLocale): boolean {
    return this.#enabledLocales.includes(lang);
  }

  resolveSwitcherEntries(args: {
    currentLocale: TLocale;
    urls: Partial<Record<TLocale, string>>;
    labels?: Record<TLocale, string>;
    config?: SwitcherConfigItem[] | null;
  }): SwitcherEntry<TLocale>[] {
    return resolveSwitcherEntries({
      ...args,
      enabledLocales: this.#enabledLocales,
      isLocale: this.isLocale.bind(this),
      localePath: this.localePath.bind(this),
    });
  }
}
