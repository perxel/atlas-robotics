import Link from "next/link";
import { headers } from "next/headers";
import { CMSDictionary, getPageQuery, getPageBlockData } from "@/lib/cms-server";
import { defaultLocale, CMSMultilingual, type Locale } from "@/lib/registry";
import { translateText } from "@/cms/multilingual";
import PageView from "@/components/pages/PageView";

// Next.js renders this for every notFound() call under [locale] (see the
// dozen call sites across app/[locale]/**) and for any unmatched path
// within this segment. It's a Next.js special file, so — confirmed against
// node_modules/next/dist/docs/.../not-found.md — it receives no props: no
// `params`, so no `locale` the way every normal page gets one. middleware.ts
// stashes the resolved locale as `x-locale` for exactly this reason.
export default async function LocaleNotFound() {
  const headersList = await headers();
  const rawLocale = headersList.get("x-locale");
  const locale: Locale = rawLocale && CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;

  const result = await getPageQuery(locale, "404");

  if (!result) {
    // The content/pages/<locale>/404.md doc is missing or was left in
    // draft — fall back to a minimal static message instead of calling
    // notFound() again, which would just recurse into this same boundary.
    const uiDictionary = await CMSDictionary.loadMap(locale);
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {translateText(uiDictionary, "Page not found")}
        </h1>
        <Link href={CMSMultilingual.localePath(locale, "/")} className="text-accent underline">
          {translateText(uiDictionary, "Back to home")}
        </Link>
      </div>
    );
  }

  const { latestPosts, products, uiDictionary } = await getPageBlockData(locale, result.data.pages.blocks);

  return (
    <PageView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
      latestPosts={latestPosts}
      products={products}
      uiDictionary={uiDictionary}
    />
  );
}
