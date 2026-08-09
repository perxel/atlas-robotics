import type {Collection} from "tinacms";
import {defineContentCollection} from "@/cms/define-content-collection";
import {galleryField} from "@/cms/collection";
import {taxonomyField} from "@/cms/taxonomy";
import {collectionPathConfig, defaultLocale, type Locale} from "@/lib/registry";

export const blogCollection: Collection = defineContentCollection<Locale>({
    name: "blog",
    label: "Blog Posts",
    hasAuthor: true,
    hasExcerpt: true,
    taxonomyFields: [taxonomyField({taxonomy: "categories", label: "Categories"})],
    extraFields: [galleryField()],
    body: {kind: "richtext"},
    locales: collectionPathConfig.blog.locales,
    defaultLocale,
});
