"use client";

import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import type { PagesQuery, PagesQueryVariables } from "@/tina/__generated__/types";
import { type Locale, type BlogPostItem, type ProductItem, CMSMultilingual, blocksDisabledSlugs } from "@/lib/cms";
import { siteUrl } from "@/cms/seo";
import { translateText } from "@/cms/multilingual";
import { buildBreadcrumbJsonLd, type BreadcrumbItem } from "@/cms/seo";
import BlocksRenderer from "@/components/blocks/BlocksRenderer";
import Breadcrumb from "@/components/Breadcrumb";

export default function PageView({
  query,
  variables,
  data,
  locale,
  latestPosts,
  products,
  currentPage = 1,
  uiDictionary,
}: {
  query: string;
  variables: PagesQueryVariables;
  data: PagesQuery;
  locale: Locale;
  latestPosts: BlogPostItem[];
  products: ProductItem[];
  /** Which page of a paginated block ("all" mode ProductListingBlock, BlogListingBlock) is showing — only meaningful on the /blog and /products listing routes. */
  currentPage?: number;
  /** Resolved `{sourceText: translation}` snapshot for this locale — see
   * cms/multilingual/translate-text.ts's comment on why this is plain data
   * fetched by a real server component, not a live function: PageView
   * itself is a client component (useTina() needs it for visual editing),
   * and a closure can't safely cross that boundary as a prop. */
  uiDictionary: Record<string, string>;
}) {
  // No-op outside Tina's admin preview iframe — returns `data` unchanged,
  // so this renders identically for normal visitors and the production build.
  const { data: liveData } = useTina({ query, variables, data });
  const page = liveData.pages;
  const blocksEnabled = !blocksDisabledSlugs.has(page.slug);
  const titleEnabled = !page.hideTitle;
  // Tina's rich-text resolver returns `{ type: "root", children: [] }` for
  // an empty/absent field, never `null` — so `page.intro` alone is always
  // truthy. Check for actual content instead, or an empty intro leaves a
  // blank, padded div in the DOM even with nothing to show.
  const hasIntro = (page.intro?.children?.length ?? 0) > 0;
  const t = (text: string) => translateText(uiDictionary, text);
  const trail: BreadcrumbItem[] = [
    { label: t("Home"), href: CMSMultilingual.localePath(locale, "/") },
    { label: page.title },
  ];

  return (
    <article>
      {titleEnabled && (
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 data-tina-field={tinaField(page, "title")} className="text-3xl font-semibold">
            {page.title}
          </h1>
          <div className="mt-2">
            <Breadcrumb items={trail} />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(trail, siteUrl)) }}
            />
          </div>
          {hasIntro && (
            <div
              data-tina-field={tinaField(page, "intro")}
              className="prose prose-sm mt-4 max-w-none text-muted-foreground"
            >
              <TinaMarkdown content={page.intro} />
            </div>
          )}
        </div>
      )}

      {blocksEnabled && page.blocks && page.blocks.length > 0 && (
        <BlocksRenderer
          blocks={page.blocks}
          locale={locale}
          latestPosts={latestPosts}
          products={products}
          currentPage={currentPage}
          uiDictionary={uiDictionary}
        />
      )}
    </article>
  );
}
