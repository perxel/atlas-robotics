import type {Collection} from "tinacms";
import {defineContentCollection} from "@/cms/define-content-collection";
import {taxonomyField} from "@/cms/taxonomy";
import {collectionPathConfig, defaultLocale, type Locale} from "@/lib/registry";

export const productsCollection: Collection = defineContentCollection<Locale>({
    name: "products",
    label: "Products",
    extraFields: [
        {
            type: "string",
            name: "excerpt",
            label: "Excerpt",
            description: "Short tagline shown on the product card and detail page.",
            ui: {component: "textarea"},
        },
        {type: "image", name: "coverImage", label: "Cover Image"},
        {
            type: "string",
            name: "coverImageAlt",
            label: "Cover Image Alt Text",
        },
        {
            type: "string",
            name: "price",
            label: "Price Label",
            description: 'Free text, e.g. "$29/mo".',
        },
        {
            type: "string",
            name: "highlights",
            label: "Highlights",
            list: true,
            description: "Short feature bullets shown on the product card and detail page.",
        },
    ],
    // See cms/taxonomy/taxonomy.field.ts: `multiple`
    // defaults to true, so a product can carry several categories at once
    // — `product.productCategories` resolves as `{ term: ProductCategory }[]`.
    taxonomyFields: [taxonomyField({taxonomy: "productCategories", label: "Categories"})],
    body: {kind: "richtext"},
    // Same locale-segment data as lib/cms-server.ts's collectionRegistry.products
    // (both come from lib/registry.ts's collectionPathConfig) — see blog's
    // schema file for why this isn't a literal "/products".
    locales: collectionPathConfig.products.locales,
    defaultLocale,
});
