import type { Collection, Template } from "tinacms";
import { slugField, slugUniquenessGuard } from "./shared-fields/slug.schema";
import { draftField } from "./shared-fields/draft.schema";
import { seoField } from "./shared-fields/seo.schema";
import { heroTemplate } from "@/components/blocks/Hero.template";
import { richTextTemplate } from "@/components/blocks/RichTextBlock.template";
import { ctaTemplate } from "@/components/blocks/Cta.template";
import { localePath, type Locale } from "@/lib/i18n";
import { reservedSlugs } from "@/lib/pages-config";

// Example block set for the `pages` collection's block-based editing.
// https://tina.io/docs/editing/blocks
// Add a new block: create <Name>.template.tsx next to its render component
// in components/blocks/, add it here, and a matching case in
// components/blocks/BlocksRenderer.tsx.
export const pageBlocks: Template[] = [heroTemplate, richTextTemplate, ctaTemplate];

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
    beforeSubmit: slugUniquenessGuard("pages"),
    // Same reasoning as blog's router (see its comment): derived from the
    // filename (_sys.breadcrumbs), not the `slug` field — `document` in
    // this callback only reliably carries `_sys` (confirmed live: reading
    // `document.slug` here produced a broken preview URL). The `home`
    // document is special-cased to the site root by filename — see
    // app/[locale]/page.tsx and the matching redirect for /home in
    // app/[locale]/[slug]/page.tsx (avoids the same content being
    // reachable at two URLs).
    router: ({ document }) => {
      const locale = document._sys.breadcrumbs[0] as Locale;
      const filename = document._sys.breadcrumbs[document._sys.breadcrumbs.length - 1];
      return filename === "home" ? localePath(locale, "/") : localePath(locale, `/${filename}`);
    },
  },
  fields: [
    { type: "string", name: "title", label: "Title", required: true },
    slugField({ reserved: reservedSlugs }),
    draftField(),
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
