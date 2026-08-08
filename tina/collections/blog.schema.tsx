import type {Collection} from "tinacms";
import {defineContentCollection} from "@/cms/define-content-collection";
import {taxonomyField} from "@/cms/taxonomy";
import {collectionPathConfig, defaultLocale, type Locale} from "@/lib/registry";

// The `defineContentCollection()` call below gives this collection title,
// slug, draft, publishDate, auto-stamped modifiedDate, and SEO for free —
// this file only supplies what's actually specific to blog posts: the
// author byline, its own image/excerpt fields, and its taxonomy.
export const blogCollection: Collection = defineContentCollection<Locale>({
    name: "blog",
    label: "Blog Posts",
    hasAuthor: true,
    extraFields: [
        {type: "image", name: "coverImage", label: "Cover Image"},
        {
            type: "string",
            name: "coverImageAlt",
            label: "Cover Image Alt Text",
        },
        {
            type: "string",
            name: "excerpt",
            label: "Excerpt",
            ui: {component: "textarea"},
        },
    ],
    // See cms/taxonomy/taxonomy.field.ts: `multiple`
    // defaults to true, so a post can carry several categories at once —
    // `post.categories` resolves as `{ term: Category }[]`, not
    // `Category[]` directly.
    taxonomyFields: [taxonomyField({taxonomy: "categories", label: "Categories"})],
    body: {kind: "richtext"},
    // Same locale-segment data as lib/cms-server.ts's collectionRegistry.blog
    // (both come from lib/registry.ts's collectionPathConfig) — not a
    // literal "/blog"; this used to hardcode the English segment, which
    // broke the vi preview link once "blog" got a translated URL ("tin-tuc").
    locales: collectionPathConfig.blog.locales,
    defaultLocale,
});
