import type { Collection } from "tinacms";
import { slugField, slugLifecycleGuard } from "@/cms/slug";
import { draftField } from "@/cms/collection";
import { composeBeforeSubmit } from "@/cms/tina-hooks";
import { seoField } from "./shared-fields/seo.schema";
import { taxonomyField } from "./shared-fields/taxonomy.schema";
import { collectionPath } from "@/lib/cms";
import type { Locale } from "@/lib/i18n";

export const blogCollection: Collection = {
  name: "blog",
  label: "Blog Posts",
  path: "content/blog",
  format: "md",
  ui: {
    // Tells the admin's live-preview pane which page a document maps
    // to, so it can visually edit it (see components/blog/BlogPostView.tsx).
    // Derived from the filename (_sys.breadcrumbs), NOT the `slug` field —
    // confirmed live that `document` in this callback only reliably
    // carries `_sys` (matching its TypeScript type, which only declares
    // `_sys`); reading a custom field here produced a broken preview URL
    // with a literal "undefined" slug. This is also what Tina's own docs
    // example does. Only correct when filename === slug (true for this
    // repo's seed content); if an editor's slug diverges from the
    // filename, this link can point at the wrong preview URL — the
    // actual page route is unaffected, since rendering resolves the
    // `slug` field via a GraphQL query (lib/tina-content.ts), not this.
    // Uses collectionPath (lib/cms.ts), not a literal "/blog"
    // — this used to hardcode the English segment, which broke the vi
    // preview link once "blog" got a translated URL ("tin-tuc").
    router: ({ document }) => {
      const locale = document._sys.breadcrumbs[0] as Locale;
      const filename = document._sys.breadcrumbs[document._sys.breadcrumbs.length - 1];
      return collectionPath(locale, "blog", `/${filename}`);
    },
    beforeSubmit: composeBeforeSubmit([slugLifecycleGuard("blog")]),
  },
  fields: [
    { type: "string", name: "title", label: "Title", required: true },
    slugField(),
    draftField(),
    { type: "image", name: "coverImage", label: "Cover Image" },
    {
      type: "string",
      name: "coverImageAlt",
      label: "Cover Image Alt Text",
    },
    { type: "string", name: "author", label: "Author" },
    {
      type: "datetime",
      name: "publishDate",
      label: "Publish Date",
    },
    {
      type: "string",
      name: "excerpt",
      label: "Excerpt",
      ui: { component: "textarea" },
    },
    // See tina/collections/shared-fields/taxonomy.schema.tsx: `multiple`
    // defaults to true, so a post can carry several categories at once —
    // `post.categories` resolves as `{ term: Category }[]`, not
    // `Category[]` directly.
    taxonomyField({ taxonomy: "categories", label: "Categories" }),
    {
      type: "rich-text",
      name: "body",
      label: "Body",
      isBody: true,
    },
    seoField(),
  ],
};
