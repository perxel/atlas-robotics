import { tinaField } from "tinacms/dist/react";
import type { PagesQuery } from "@/tina/__generated__/types";
import type { Locale } from "@/lib/i18n";
import type { getBlogPosts, getProducts } from "@/lib/cms";
import Hero from "./Hero";
import RichTextBlock from "./RichTextBlock";
import Cta from "./Cta";
import FeatureGrid from "./FeatureGrid";
import Newsletter from "./Newsletter";
import FeaturedBlogPosts from "./FeaturedBlogPosts";
import ContactFormBlock from "./ContactFormBlock";
import BlogListingBlock from "./BlogListingBlock";
import ProductListingBlock from "./ProductListingBlock";

// Add a new block: create <Name>.template.tsx next to its render component
// (see Hero.template.tsx), add it to `pageBlocks` in
// tina/collections/pages.schema.tsx, then a case here mapping its
// __typename to the render component. Each block is wrapped with
// tinaField(block) (no field name = "edit this whole block") so it's
// click-to-edit in Tina's admin preview — a no-op outside that context,
// since tinaField() returns "" when the object has no live-edit metadata.
//
// `locale`/`latestPosts`/`products` are extra data blocks need but don't
// carry themselves (FeaturedBlogPosts/BlogListingBlock need blog posts,
// ProductListingBlock needs products) — threaded down from the page
// component through PageView rather than fetched by the block itself,
// since blocks render inside PageView's client component tree. Newsletter
// and ContactFormBlock's field-level copy (labels/placeholders/button text)
// is optional on the block itself, falling back to lib/dictionary.ts (UI
// chrome) when unset — see NewsletterForm.tsx/ContactForm.tsx.
//
// `currentPage` is the same idea but comes from the URL (see
// app/[locale]/blog/listing.tsx and .../products/listing.tsx), not CMS
// content — only BlogListingBlock and ProductListingBlock's "all" mode
// read it, everything else ignores it.
//
// `blocks` is typed from PagesQuery directly rather than the generated
// `PagesBlocks` union — see ProductListingBlock.tsx's comment on
// `ProductListingData` for why: `PagesBlocks` (via `PagesBlocksProductListing`)
// types `manualProducts[].product` against the reusable single-document
// `Products` type, which isn't quite what a `reference` field nested inside
// this query actually resolves to. Deriving from PagesQuery matches what's
// really on the wire.
type Blocks = NonNullable<PagesQuery["pages"]["blocks"]>;

export default function BlocksRenderer({
  blocks,
  locale,
  latestPosts,
  products,
  currentPage = 1,
}: {
  blocks: Blocks;
  locale: Locale;
  latestPosts: Awaited<ReturnType<typeof getBlogPosts>>;
  products: Awaited<ReturnType<typeof getProducts>>;
  currentPage?: number;
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
              <Newsletter data={block} locale={locale} />
            )}
            {block.__typename === "PagesBlocksFeaturedBlogPosts" && (
              <FeaturedBlogPosts data={block} posts={latestPosts} locale={locale} />
            )}
            {block.__typename === "PagesBlocksContactForm" && (
              <ContactFormBlock data={block} locale={locale} />
            )}
            {block.__typename === "PagesBlocksBlogListing" && (
              <BlogListingBlock
                data={block}
                posts={latestPosts}
                locale={locale}
                currentPage={currentPage}
              />
            )}
            {block.__typename === "PagesBlocksProductListing" && (
              <ProductListingBlock
                data={block}
                products={products}
                locale={locale}
                currentPage={currentPage}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
