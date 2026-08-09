import type {Collection} from "tinacms";
import {defineContentCollection} from "@/cms/define-content-collection";
import {galleryField} from "@/cms/collection";
import {taxonomyField} from "@/cms/taxonomy";
import {collectionPathConfig, defaultLocale, type Locale} from "@/lib/registry";

export const productsCollection: Collection = defineContentCollection<Locale>({
    name: "products",
    label: "Products",
    hasExcerpt: true,
    topFields: [
        {
            type: "string",
            name: "price",
            label: "Price Label",
            description: 'Free text, e.g. "$29/mo".',
        },
    ],
    extraFields: [
        {
            type: "string",
            name: "highlights",
            label: "Highlights",
            list: true,
            description: "Short feature bullets shown on the product card and detail page.",
        },
        galleryField(),
    ],
    taxonomyFields: [taxonomyField({taxonomy: "productCategories", label: "Categories"})],
    body: {kind: "richtext"},
    locales: collectionPathConfig.products.locales,
    defaultLocale,
});
