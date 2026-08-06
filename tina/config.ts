import { defineConfig, type Collection } from "tinacms";
import { seoField } from "./seo-schema";
import { draftField } from "./draft-field";
import { slugField, slugUniquenessGuard, assertSlugFieldsHaveGuard } from "./slug-field";
import { pageBlocks } from "./blocks";
import { localePath, type Locale } from "../lib/i18n";
import { reservedSlugs } from "../lib/pages-config";

// Local dev runs fully self-hosted (no Tina Cloud project needed).
// Setting NEXT_PUBLIC_TINA_CLIENT_ID / TINA_TOKEN switches to Tina Cloud.
const branch =
  process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "main";

// Explicitly typed (rather than inferred via defineConfig's argument
// position) so it can be extracted and passed to assertSlugFieldsHaveGuard
// before being handed to defineConfig — this is also what keeps the inline
// `itemProps`/`router`/etc. callback parameters below contextually typed
// instead of falling back to implicit `any`.
const collections: Collection[] = [
  {
    name: "siteSettings",
    label: "Site Settings",
    path: "content/site-settings",
    format: "json",
    ui: {
      global: true,
      allowedActions: {
        create: false,
        delete: false,
      },
    },
    fields: [
      {
        type: "string",
        name: "title",
        label: "Site Title",
        required: true,
      },
      {
        type: "image",
        name: "logo",
        label: "Logo",
      },
      {
        type: "image",
        name: "favicon",
        label: "Favicon",
      },
      seoField("defaultSeo", "Default SEO"),
      {
        type: "object",
        name: "socialLinks",
        label: "Social Links",
        list: true,
        ui: {
          itemProps: (item) => ({ label: item?.platform || "Social Link" }),
        },
        fields: [
          { type: "string", name: "platform", label: "Platform Name" },
          { type: "string", name: "url", label: "URL" },
          {
            type: "string",
            name: "icon",
            label: "Icon Identifier",
            description: "e.g. facebook, instagram, x, youtube, linkedin",
          },
        ],
      },
    ],
  },
  {
    name: "nav",
    label: "Navigation",
    path: "content/nav",
    format: "json",
    ui: {
      global: true,
      allowedActions: {
        create: false,
        delete: false,
      },
    },
    fields: [
      {
        type: "object",
        name: "links",
        label: "Nav Links",
        list: true,
        ui: {
          itemProps: (item) => ({ label: item?.label || "Link" }),
        },
        fields: [
          { type: "string", name: "label", label: "Label", required: true },
          { type: "string", name: "url", label: "URL", required: true },
          {
            type: "boolean",
            name: "openInNewTab",
            label: "Open in new tab",
          },
        ],
      },
    ],
  },
  {
    name: "footer",
    label: "Footer",
    path: "content/footer",
    format: "json",
    ui: {
      global: true,
      allowedActions: {
        create: false,
        delete: false,
      },
    },
    fields: [
      {
        type: "object",
        name: "columns",
        label: "Footer Columns",
        list: true,
        ui: {
          itemProps: (item) => ({ label: item?.title || "Column" }),
        },
        fields: [
          { type: "string", name: "title", label: "Column Title" },
          {
            type: "object",
            name: "links",
            label: "Links",
            list: true,
            ui: {
              itemProps: (item) => ({ label: item?.label || "Link" }),
            },
            fields: [
              { type: "string", name: "label", label: "Label" },
              { type: "string", name: "url", label: "URL" },
            ],
          },
        ],
      },
      {
        type: "object",
        name: "contactInfo",
        label: "Contact Info",
        fields: [
          { type: "string", name: "address", label: "Address" },
          { type: "string", name: "phone", label: "Phone" },
          { type: "string", name: "email", label: "Email" },
        ],
      },
    ],
  },
  {
    name: "catalog",
    label: "Catalog Tabs",
    path: "content/catalog",
    format: "md",
    fields: [
      { type: "string", name: "name", label: "Tab Name", required: true },
      draftField(),
      {
        type: "number",
        name: "sortOrder",
        label: "Sort Order",
        description: "Lower numbers appear first",
      },
      {
        type: "rich-text",
        name: "intro",
        label: "Intro Copy",
        isBody: true,
      },
      {
        type: "string",
        name: "status",
        label: "Status",
        options: ["active", "inactive"],
      },
      {
        type: "datetime",
        name: "effectiveDate",
        label: "Effective Date",
      },
      {
        type: "object",
        name: "pages",
        label: "Image Pages",
        list: true,
        ui: {
          itemProps: (item) => ({ label: item?.alt || "Page" }),
        },
        fields: [
          { type: "image", name: "desktopImage", label: "Desktop Image" },
          { type: "image", name: "mobileImage", label: "Mobile Image" },
          { type: "string", name: "alt", label: "Alt Text" },
        ],
      },
      seoField(),
    ],
  },
  {
    name: "storyCards",
    label: "Story Cards",
    path: "content/story-cards",
    format: "md",
    fields: [
      { type: "string", name: "title", label: "Title", required: true },
      { type: "string", name: "subtitle", label: "Subtitle" },
      draftField(),
      {
        type: "number",
        name: "sortOrder",
        label: "Sort Order",
        description: "Lower numbers appear first",
      },
      { type: "image", name: "primaryImage", label: "Primary Image" },
      { type: "image", name: "secondaryImage", label: "Secondary Image" },
      {
        type: "image",
        name: "attachmentPdf",
        label: "Attachment (PDF)",
        description:
          "Tina's image field accepts any file type through repo based media, including PDFs.",
      },
      {
        type: "object",
        name: "attributes",
        label: "Attributes",
        list: true,
        ui: {
          itemProps: (item) => ({ label: item?.name || "Attribute" }),
        },
        fields: [
          { type: "string", name: "name", label: "Name" },
          { type: "string", name: "value", label: "Value" },
        ],
      },
      {
        type: "rich-text",
        name: "body",
        label: "Body Copy",
        isBody: true,
      },
      seoField(),
    ],
  },
  {
    name: "blog",
    label: "Blog Posts",
    path: "content/blog",
    format: "md",
    ui: {
      // Tells the admin's live-preview pane which page a document maps
      // to, so it can visually edit it (see components/blog/BlogPostView.tsx).
      // `document` is only typed with `_sys` (not collection-specific
      // fields) even though `slug` exists on it at runtime — safe to
      // read here because slugUniquenessGuard below guarantees it's
      // unique per locale, so it's the correct canonical routing key
      // (not the filename, which editors don't control).
      router: ({ document }) => {
        const locale = document._sys.breadcrumbs[0] as Locale;
        const slug = (document as unknown as { slug: string }).slug;
        return `${localePath(locale, "/blog")}/${slug}`;
      },
      beforeSubmit: slugUniquenessGuard("blog"),
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
      {
        type: "rich-text",
        name: "body",
        label: "Body",
        isBody: true,
      },
      seoField(),
    ],
  },
  {
    name: "contactFormConfig",
    label: "Contact Form Fields",
    path: "content/contact-form-config",
    format: "json",
    fields: [
      { type: "string", name: "label", label: "Field Label", required: true },
      {
        type: "string",
        name: "fieldType",
        label: "Field Type",
        options: ["text", "email", "textarea"],
        required: true,
      },
      {
        type: "boolean",
        name: "required",
        label: "Required",
      },
      {
        type: "number",
        name: "sortOrder",
        label: "Sort Order",
        description: "Lower numbers appear first",
      },
    ],
  },
  {
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
      // Same reasoning as blog's router (see its comment): reading `slug`
      // off `document` is safe because slugUniquenessGuard above guarantees
      // it's unique per locale. The "home" document is special-cased to the
      // site root — see app/[locale]/page.tsx and the matching redirect for
      // /home in app/[locale]/[slug]/page.tsx (avoids the same content
      // being reachable at two URLs).
      router: ({ document }) => {
        const locale = document._sys.breadcrumbs[0] as Locale;
        const slug = (document as unknown as { slug: string }).slug;
        return slug === "home" ? localePath(locale, "/") : localePath(locale, `/${slug}`);
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
  },
];

assertSlugFieldsHaveGuard(collections);

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,
  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  media: {
    // Repo based media: uploads live in the git repo under public/uploads,
    // not an external provider like Cloudinary/S3.
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public",
    },
  },
  schema: {
    collections,
  },
});
