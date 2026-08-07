import type { Collection, Template } from "tinacms";
import { slugField, slugLifecycleGuard } from "./shared-fields/slug.schema";
import { draftField } from "./shared-fields/draft.schema";
import { seoField } from "./shared-fields/seo.schema";
import { heroTemplate } from "@/components/blocks/Hero.template";
import { richTextTemplate } from "@/components/blocks/RichTextBlock.template";
import { ctaTemplate } from "@/components/blocks/Cta.template";
import { featureGridTemplate } from "@/components/blocks/FeatureGrid.template";
import { newsletterTemplate } from "@/components/blocks/Newsletter.template";
import { featuredBlogPostsTemplate } from "@/components/blocks/FeaturedBlogPosts.template";
import { contactFormTemplate } from "@/components/blocks/ContactFormBlock.template";
import { blogListingTemplate } from "@/components/blocks/BlogListingBlock.template";
import { productListingTemplate } from "@/components/blocks/ProductListingBlock.template";
import type { Locale } from "@/lib/i18n";
import { reservedSlugs } from "@/lib/pages-config";
import { resolvePagesDocumentUrl } from "@/lib/collection-slugs";

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

export const pagesCollection: Collection = {
  name: "pages",
  label: "Pages",
  path: "content/pages",
  format: "md",
  ui: {
    allowedActions: {
      // Set to false for clients who should only edit existing pages,
      // not create new ones.
      create: true,
    },
    beforeSubmit: slugLifecycleGuard("pages"),
    // Same reasoning as blog's router (see its comment): derived from the
    // filename (_sys.breadcrumbs), not the `slug` field — `document` in
    // this callback only reliably carries `_sys` (confirmed live: reading
    // `document.slug` here produced a broken preview URL). Delegates to
    // resolvePagesDocumentUrl (lib/collection-slugs.ts), passing `filename`
    // as a stand-in for `slug` since the real field isn't available here —
    // only correct when filename === slug, same limitation as before; that
    // helper's `home`/listing-page special cases don't depend on it, only
    // its fallback branch does.
    router: ({ document }) => {
      const locale = document._sys.breadcrumbs[0] as Locale;
      const filename = document._sys.breadcrumbs[document._sys.breadcrumbs.length - 1];
      return resolvePagesDocumentUrl(locale, filename, filename);
    },
  },
  fields: [
    { type: "string", name: "title", label: "Title", required: true },
    slugField({ reserved: reservedSlugs }),
    draftField(),
    {
      type: "boolean",
      name: "hideTitle",
      label: "Hide Page Title",
      description:
        "Hide the page title (and breadcrumb, where shown) above this page's content. Off by default; turn on for pages like the homepage where a block below — a hero, for example — already carries its own heading.",
    },
    {
      type: "rich-text",
      name: "intro",
      label: "Intro Copy",
      description:
        "Shown above the sections below. Also the only content rendered when block editing is disabled for this page in code (see lib/pages-config.ts).",
    },
    {
      type: "object",
      name: "blocks",
      label: "Sections",
      list: true,
      templates: pageBlocks,
    },
    seoField(),
  ],
};
