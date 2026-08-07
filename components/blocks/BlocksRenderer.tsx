import { tinaField } from "tinacms/dist/react";
import type { PagesBlocks } from "@/tina/__generated__/types";
import type { Locale } from "@/lib/i18n";
import type { getBlogPosts } from "@/lib/tina-content";
import type { NewsletterFormCopy } from "./NewsletterForm";
import Hero from "./Hero";
import RichTextBlock from "./RichTextBlock";
import Cta from "./Cta";
import FeatureGrid from "./FeatureGrid";
import Newsletter from "./Newsletter";
import FeaturedBlogPosts from "./FeaturedBlogPosts";

// Add a new block: create <Name>.template.tsx next to its render component
// (see Hero.template.tsx), add it to `pageBlocks` in
// tina/collections/pages.schema.tsx, then a case here mapping its
// __typename to the render component. Each block is wrapped with
// tinaField(block) (no field name = "edit this whole block") so it's
// click-to-edit in Tina's admin preview — a no-op outside that context,
// since tinaField() returns "" when the object has no live-edit metadata.
//
// `locale`/`latestPosts`/`newsletterFormCopy` are extra data blocks need
// but don't carry themselves (FeaturedBlogPosts needs blog posts,
// Newsletter needs the global forms doc's copy) — threaded down from the
// page component through PageView rather than fetched by the block itself,
// since blocks render inside PageView's client component tree.
export default function BlocksRenderer({
  blocks,
  locale,
  latestPosts,
  newsletterFormCopy,
}: {
  blocks: (PagesBlocks | null)[];
  locale: Locale;
  latestPosts: Awaited<ReturnType<typeof getBlogPosts>>;
  newsletterFormCopy: NewsletterFormCopy | null | undefined;
}) {
  return (
    <>
      {blocks.map((block, i) => {
        if (!block) return null;
        return (
          <div key={i} data-tina-field={tinaField(block)}>
            {block.__typename === "PagesBlocksHero" && <Hero data={block} />}
            {block.__typename === "PagesBlocksRichText" && <RichTextBlock data={block} />}
            {block.__typename === "PagesBlocksCta" && <Cta data={block} />}
            {block.__typename === "PagesBlocksFeatureGrid" && <FeatureGrid data={block} />}
            {block.__typename === "PagesBlocksNewsletter" && (
              <Newsletter data={block} formsCopy={newsletterFormCopy} locale={locale} />
            )}
            {block.__typename === "PagesBlocksFeaturedBlogPosts" && (
              <FeaturedBlogPosts data={block} posts={latestPosts} locale={locale} />
            )}
          </div>
        );
      })}
    </>
  );
}
