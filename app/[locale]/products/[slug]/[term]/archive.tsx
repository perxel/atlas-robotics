import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { translateText } from "@/cms/multilingual";
import { paginateItems, redirectIfPageMismatch } from "@/cms/pagination";
import Pagination from "@/components/Pagination";
import {
  type Locale,
  CMSCollection,
  CMSTaxonomy,
  CMSDictionary,
  CMSSeo,
  type ProductItem,
  getSiteSettings,
  resolveLocaleAlternates,
} from "@/lib/cms-server";
import { CMSMultilingual } from "@/lib/registry";

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
    CMSCollection.getCollectionPath({
      collectionName: "products",
      lang: locale,
      rest: `/${taxonomySegment}/${termSlug}`,
    });
  const [archive, settings, alternates, uiDictionary] = await Promise.all([
    loadArchive(locale, taxonomySegment, termSlug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    CMSDictionary.loadMap(locale),
  ]);
  const t = (text: string) => translateText(uiDictionary, text);

  return CMSSeo.buildMetadata({
    lang: locale,
    pathWithoutLocale: CMSMultilingual.stripLocalePrefix(pathname),
    alternates,
    fallbackTitle: archive
      ? `${archive.term.title} — ${t("Products")} — ${settings?.title || t("Lorem ipsum")}`
      : t("Products"),
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
  const [archive, uiDictionary] = await Promise.all([
    loadArchive(locale, taxonomySegment, termSlug),
    CMSDictionary.loadMap(locale),
  ]);
  const t = (text: string) => translateText(uiDictionary, text);

  if (!archive) notFound();

  const basePath = CMSCollection.getCollectionPath({
    collectionName: "products",
    lang: locale,
    rest: `/${taxonomySegment}/${termSlug}`,
  });
  const { items: shown, currentPage, totalPages } = paginateItems(
    archive.products,
    requestedPage,
    CMSCollection.getPageSize("products")
  );
  redirectIfPageMismatch(requestedPage, currentPage, basePath);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm text-muted-foreground">
        <Link
          href={CMSCollection.getCollectionPath({ collectionName: "products", lang: locale })}
          className="hover:text-accent"
        >
          {t("Products")}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{archive.term.title}</h1>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((product) => (
          <Link
            key={product.id}
            href={CMSCollection.getCollectionPath({
              collectionName: "products",
              lang: locale,
              rest: `/${product.slug}`,
            })}
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
        <p className="mt-8 text-sm text-muted-foreground">{t("No products published yet.")}</p>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
        uiDictionary={uiDictionary}
      />
    </div>
  );
}
