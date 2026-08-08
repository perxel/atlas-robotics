import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import { collectionPath, CMSTaxonomy, type ProductItem } from "@/lib/cms";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import { paginateItems, redirectIfPageMismatch } from "@/cms/pagination";
import Pagination from "@/components/Pagination";
import type { Locale } from "@/lib/i18n";

/**
 * Generic archive route for any taxonomy attached to `products` — same
 * pattern as app/[locale]/blog/[slug]/[term]/archive.tsx (see that file's
 * comment for why the folder is named `[slug]`, not `[taxonomy]`).
 *
 * Not a route file itself — shared by page.tsx (page 1, canonical) and
 * page/[pageNum]/page.tsx (page >= 2), same as
 * app/[locale]/products/listing.tsx for the main listing page.
 */
async function loadArchive(locale: Locale, taxonomySegment: string, termSlug: string) {
  const taxonomyName = CMSTaxonomy.resolveUrlSegment({
    collectionName: "products",
    lang: locale,
    urlSegment: taxonomySegment,
  });
  if (!taxonomyName) return null;

  const term = await CMSTaxonomy.getTerm({ taxonomyName, lang: locale, slug: termSlug });
  if (!term) return null;

  const { items: products } = await CMSTaxonomy.getItemsByTerm<ProductItem>({
    collectionName: "products",
    taxonomyName,
    termSlug,
    lang: locale,
  });

  return { term, products };
}

export async function generateProductsArchiveMetadata(
  locale: Locale,
  taxonomySegment: string,
  termSlug: string
): Promise<Metadata> {
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ||
    collectionPath(locale, "products", `/${taxonomySegment}/${termSlug}`);
  const [archive, settings, alternates] = await Promise.all([
    loadArchive(locale, taxonomySegment, termSlug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
  ]);
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    alternates,
    fallbackTitle: archive
      ? `${archive.term.title} — ${dict.products.pageTitle} — ${settings?.title || dict.siteName}`
      : dict.products.pageTitle,
  });
}

export async function ProductsArchive({
  locale,
  taxonomySegment,
  termSlug,
  requestedPage,
}: {
  locale: Locale;
  taxonomySegment: string;
  termSlug: string;
  requestedPage: number;
}) {
  const dict = getDictionary(locale);
  const archive = await loadArchive(locale, taxonomySegment, termSlug);

  if (!archive) notFound();

  const basePath = collectionPath(locale, "products", `/${taxonomySegment}/${termSlug}`);
  const { items: shown, currentPage, totalPages } = paginateItems(archive.products, requestedPage);
  redirectIfPageMismatch(requestedPage, currentPage, basePath);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm text-muted-foreground">
        <Link href={collectionPath(locale, "products")} className="hover:text-accent">
          {dict.products.pageTitle}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{archive.term.title}</h1>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((product) => (
          <Link
            key={product.id}
            href={collectionPath(locale, "products", `/${product.slug}`)}
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

      {shown.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{dict.products.noProducts}</p>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
        locale={locale}
      />
    </div>
  );
}
