import type {Collection, Template} from "tinacms";
import {defineContentCollection} from "@/cms/define-content-collection";
import {heroTemplate} from "@/components/blocks/Hero.template";
import {richTextTemplate} from "@/components/blocks/RichTextBlock.template";
import {ctaTemplate} from "@/components/blocks/Cta.template";
import {featureGridTemplate} from "@/components/blocks/FeatureGrid.template";
import {newsletterTemplate} from "@/components/blocks/Newsletter.template";
import {featuredBlogPostsTemplate} from "@/components/blocks/FeaturedBlogPosts.template";
import {contactFormTemplate} from "@/components/blocks/ContactFormBlock.template";
import {blogListingTemplate} from "@/components/blocks/BlogListingBlock.template";
import {productListingTemplate} from "@/components/blocks/ProductListingBlock.template";
import {CMSCollection} from "@/lib/cms-server";
import {type Locale, lockedSlugFilenames, reservedSlugs} from "@/lib/registry";

// Block set for the `pages` collection's block-based editing.
// https://tina.io/docs/editing/blocks
// Add a new block: create <Name>.template.tsx next to its render component
// in components/blocks/, add it here, and a matching case in
// components/blocks/BlocksRenderer.tsx.
export const pageBlocks: Template[] = [
  heroTemplate,
  richTextTemplate,
  ctaTemplate,
  featureGridTemplate,
  newsletterTemplate,
  featuredBlogPostsTemplate,
  contactFormTemplate,
  blogListingTemplate,
  productListingTemplate,
];

export const pagesCollection: Collection = defineContentCollection<Locale>({
  name: "pages",
  label: "Pages",
    reserved: reservedSlugs,
    lockedFilenames: lockedSlugFilenames,
    allowedActions: {
        // Set to false for clients who should only edit existing pages, not
        // create new ones.
        create: true,
    },
    extraFields: [
    {
      type: "boolean",
      name: "hideTitle",
      label: "Hide Page Title",
      description:
        "Hide the entire title/breadcrumb/intro section above this page's blocks — not just the title, the whole section, Intro Copy included. Off by default; turn on for pages like the homepage where a block below — a hero, for example — already carries its own heading.",
    },
    {
      type: "rich-text",
      name: "intro",
      label: "Intro Copy",
      description:
          "Shown above the sections below. Also the only content rendered when block editing is disabled for this page in code (see lib/registry.ts's blocksDisabledSlugs).",
    },
  ],
    body: {kind: "blocks", templates: pageBlocks},
    // Same reasoning as blog's/product's getUrl (see their schema files):
    // `filename` stands in for `slug` since the real field isn't available
    // in this callback — only correct when filename === slug, same
    // limitation as before; resolvePagesDocumentUrl's `home`/listing-page
    // special cases don't depend on it, only its fallback branch does.
    getUrl: ({lang, filename}) => CMSCollection.resolvePagesDocumentUrl(lang, filename, filename),
});
