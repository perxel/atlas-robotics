import type { Metadata } from "next";
import type { SeoFields } from "./types";

/**
 * `buildMetadata`/`buildAlternates`, ported from the project's old
 * project's old lib/seo.ts (now removed — see lib/cms-server.ts's CMSSeo) to a
 * class. See .claude/plans/04-seo.md.
 */
export class SeoService<TLocale extends string> {
  #siteUrl: string;
  #defaultLocale: TLocale;
  #locales: readonly TLocale[];

  constructor(options: { siteUrl: string; defaultLocale: TLocale; locales: readonly TLocale[] }) {
    this.#siteUrl = options.siteUrl;
    this.#defaultLocale = options.defaultLocale;
    this.#locales = options.locales;
  }

  /** Same prefixing rule as the project's locale routing — kept as a small
   * private copy rather than a cross-domain dependency on Multilingual,
   * same reasoning as CollectionService's own private copy. */
  #localePath(locale: TLocale, pathWithoutLocale: string): string {
    const clean = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
    return locale === this.#defaultLocale ? clean || "/" : `/${locale}${clean}`;
  }

  buildAlternates(args: {
    pathWithoutLocale: string;
    lang: TLocale;
    alternates: Partial<Record<TLocale, string>>;
  }): { canonical: string; languages: Record<string, string> } {
    const { pathWithoutLocale, lang, alternates } = args;
    const languages: Record<string, string> = {};
    for (const l of this.#locales) {
      if (alternates[l]) languages[l] = `${this.#siteUrl}${alternates[l]}`;
    }
    if (Object.keys(languages).length > 0) {
      // x-default must be the SAME target on every locale variant in this
      // page's cluster — search engines treat hreflang as a reciprocal
      // set, so every locale variant needs to point x-default at one
      // agreed URL, not each other's own. Prefer defaultLocale's URL; only
      // fall through in registered-locale order if that locale's own
      // alternate wasn't resolved (e.g. a translation gap), so this is
      // always deterministic and never depends on which locale is
      // currently rendering.
      const xDefaultLocale = [this.#defaultLocale, ...this.#locales].find((l) => alternates[l]);
      if (xDefaultLocale) {
        languages["x-default"] = `${this.#siteUrl}${alternates[xDefaultLocale]}`;
      }
    }

    return {
      canonical: `${this.#siteUrl}${this.#localePath(lang, pathWithoutLocale)}`,
      languages,
    };
  }

  buildMetadata(args: {
    lang: TLocale;
    pathWithoutLocale: string;
    /** A locale missing from this map just doesn't get an hreflang entry,
     * rather than guessing at a URL that might not exist. Resolved
     * externally — see .claude/plans/04-seo.md's note on why `alternates`
     * resolution stays outside this class. */
    alternates?: Partial<Record<TLocale, string>>;
    seo?: SeoFields;
    fallbackTitle: string;
    fallbackDescription?: string | null;
    fallbackOgImage?: string | null;
  }): Metadata {
    const { lang, pathWithoutLocale, alternates = {}, seo, fallbackTitle, fallbackDescription, fallbackOgImage } =
      args;

    const title = seo?.metaTitle || fallbackTitle;
    const description = seo?.metaDescription || fallbackDescription || undefined;
    const ogImage = seo?.ogImage || fallbackOgImage || undefined;
    const ogImageAlt = seo?.ogImage ? seo?.ogImageAlt || undefined : undefined;

    return {
      title,
      description,
      alternates: this.buildAlternates({ pathWithoutLocale, lang, alternates }),
      openGraph: {
        title,
        description,
        images: ogImage ? [{ url: ogImage, alt: ogImageAlt }] : undefined,
        locale: lang,
      },
    };
  }
}
