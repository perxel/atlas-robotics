"use client";

import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import type { PagesQuery, PagesQueryVariables } from "@/tina/__generated__/types";
import { isBlocksEnabled } from "@/lib/pages-config";
import BlocksRenderer from "@/components/blocks/BlocksRenderer";

export default function PageView({
  query,
  variables,
  data,
}: {
  query: string;
  variables: PagesQueryVariables;
  data: PagesQuery;
}) {
  // No-op outside Tina's admin preview iframe — returns `data` unchanged,
  // so this renders identically for normal visitors and the production build.
  const { data: liveData } = useTina({ query, variables, data });
  const page = liveData.pages;
  const blocksEnabled = isBlocksEnabled(page.slug);

  return (
    <article>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 data-tina-field={tinaField(page, "title")} className="text-3xl font-semibold">
          {page.title}
        </h1>
        {page.intro && (
          <div
            data-tina-field={tinaField(page, "intro")}
            className="prose prose-sm mt-4 max-w-none text-muted-foreground"
          >
            <TinaMarkdown content={page.intro} />
          </div>
        )}
      </div>

      {blocksEnabled && page.blocks && page.blocks.length > 0 && (
        <BlocksRenderer blocks={page.blocks} />
      )}
    </article>
  );
}
