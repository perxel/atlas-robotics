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
        create: true,
    },
    extraFields: [
        {
            type: "boolean",
            name: "hideTitle",
            label: "Hide Page Title",
            description:
                "Hide the title/breadcrumb section above this page's blocks. Off by default; turn on for pages like the homepage where a block below — a hero, for example — already carries its own heading.",
        },
    ],
    body: {kind: "blocks", templates: pageBlocks},
    getUrl: ({lang, filename}) => CMSCollection.resolvePagesDocumentUrl(lang, filename, filename),
});
