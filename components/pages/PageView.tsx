"use client";

import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import type { PagesQuery, PagesQueryVariables } from "@/tina/__generated__/types";
import { isBlocksEnabled } from "@/lib/pages-config";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import type { getBlogPosts, getProducts } from "@/lib/tina-content";
import BlocksRenderer from "@/components/blocks/BlocksRenderer";
import Breadcrumb from "@/components/Breadcrumb";

export default function PageView({
  query,
  variables,
  data,
  locale,
  latestPosts,
  products,
}: {
  query: string;
  variables: PagesQueryVariables;
  data: PagesQuery;
  locale: Locale;
  latestPosts: Awaited<ReturnType<typeof getBlogPosts>>;
  products: Awaited<ReturnType<typeof getProducts>>;
}) {
  // No-op outside Tina's admin preview iframe — returns `data` unchanged,
  // so this renders identically for normal visitors and the production build.
  const { data: liveData } = useTina({ query, variables, data });
  const page = liveData.pages;
  const blocksEnabled = isBlocksEnabled(page.slug);
  const titleEnabled = !page.hideTitle;
  // Tina's rich-text resolver returns `{ type: "root", children: [] }` for
  // an empty/absent field, never `null` — so `page.intro` alone is always
  // truthy. Check for actual content instead, or an empty intro leaves a
  // blank, padded div in the DOM even with nothing to show.
  const hasIntro = (page.intro?.children?.length ?? 0) > 0;
  const dict = getDictionary(locale);

  return (
    <article>
      {titleEnabled && (
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h1 data-tina-field={tinaField(page, "title")} className="text-3xl font-semibold">
            {page.title}
          </h1>
          <div className="mt-2">
            <Breadcrumb
              items={[
                { label: dict.breadcrumb.home, href: localePath(locale, "/") },
                { label: page.title },
              ]}
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
        />
      )}
    </article>
  );
}
