import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import {
  getProducts,
  getProductCategories,
  getSiteSettings,
  filterByTaxonomyTerm,
} from "@/lib/tina-content";
import { getTaxonomyRegistryEntry } from "@/lib/taxonomies";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

/**
 * Generic archive route for any taxonomy attached to `products` — same
 * pattern as app/[locale]/blog/[slug]/[term]/page.tsx (see that file's
 * comment for why the folder is named `[slug]`, not `[taxonomy]`).
 */
async function resolveTerm(taxonomy: string, locale: Locale, termSlug: string) {
  if (taxonomy !== "productCategories") return null;
  const categories = await getProductCategories(locale);
  return categories.find((c) => c.slug === termSlug) || null;
}

async function loadArchive(locale: Locale, taxonomySegment: string, termSlug: string) {
  const entry = getTaxonomyRegistryEntry("products", taxonomySegment);
  if (!entry) return null;

  const term = await resolveTerm(entry.taxonomy, locale, termSlug);
  if (!term) return null;

  const products = await getProducts(locale);
  const filtered = filterByTaxonomyTerm(products, entry.fieldName, termSlug);

  return { term, products: filtered };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ||
    localePath(locale, `/products/${taxonomySegment}/${termSlug}`);
  const [archive, settings] = await Promise.all([
    loadArchive(locale, taxonomySegment, termSlug),
    getSiteSettings(locale),
  ]);
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    fallbackTitle: archive
      ? `${archive.term.title} — ${dict.products.pageTitle} — ${settings?.title || dict.siteName}`
      : dict.products.pageTitle,
  });
}

export default async function ProductsTaxonomyArchivePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string }>;
}) {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);
  const archive = await loadArchive(locale, taxonomySegment, termSlug);

  if (!archive) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-sm text-muted-foreground">
        <Link href={localePath(locale, "/products")} className="hover:text-accent">
          {dict.products.pageTitle}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{archive.term.title}</h1>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {archive.products.map((product) => (
          <Link
            key={product.id}
            href={localePath(locale, `/products/${product.slug}`)}
            className="block overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
          >
            {product.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.coverImage}
                alt={product.coverImageAlt || ""}
                className="aspect-video w-full object-cover"
              />
            )}
            <div className="p-4">
              <h2 className="font-semibold">{product.title}</h2>
              {product.excerpt && (
                <p className="mt-2 text-sm text-muted-foreground">{product.excerpt}</p>
              )}
              {product.price && (
                <p className="mt-3 text-sm font-semibold">{product.price}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {archive.products.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{dict.products.noProducts}</p>
      )}
    </div>
  );
}
