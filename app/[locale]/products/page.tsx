import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getProducts, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/products");
  const settings = await getSiteSettings(locale);
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    fallbackTitle: `${dict.products.pageTitle} — ${settings?.title || dict.siteName}`,
    fallbackDescription: dict.products.pageDescription,
  });
}

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const products = await getProducts(locale);
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{dict.products.pageTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{dict.products.pageDescription}</p>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
          >
            <Link href={localePath(locale, `/products/${product.slug}`)}>
              {product.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.coverImage}
                  alt={product.coverImageAlt || ""}
                  className="aspect-video w-full object-cover"
                />
              )}
            </Link>
            <div className="flex flex-1 flex-col p-4">
              {product.productCategories && product.productCategories.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {product.productCategories.map((c) =>
                    c?.term ? (
                      <Link
                        key={c.term.slug}
                        href={localePath(locale, `/products/category/${c.term.slug}`)}
                        className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-foreground hover:opacity-80"
                      >
                        {c.term.title}
                      </Link>
                    ) : null
                  )}
                </div>
              )}
              <h2 className="font-semibold">
                <Link href={localePath(locale, `/products/${product.slug}`)}>{product.title}</Link>
              </h2>
              {product.excerpt && (
                <p className="mt-2 text-sm text-muted-foreground">{product.excerpt}</p>
              )}
              <div className="mt-4 flex flex-1 items-end justify-between gap-3">
                {product.price && <span className="text-sm font-semibold">{product.price}</span>}
                <Link
                  href={localePath(locale, `/products/${product.slug}`)}
                  className="text-sm font-medium text-accent hover:opacity-80"
                >
                  {dict.products.viewDetails}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{dict.products.noProducts}</p>
      )}
    </div>
  );
}
