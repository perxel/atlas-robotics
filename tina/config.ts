import { defineConfig } from "tinacms";
import { seoField } from "./seo-schema";
import { localePath, type Locale } from "../lib/i18n";

// Local dev runs fully self-hosted (no Tina Cloud project needed).
// Setting NEXT_PUBLIC_TINA_CLIENT_ID / TINA_TOKEN switches to Tina Cloud.
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  "main";

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
    collections: [
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
          // `document` is only typed with `_sys` here (not collection-specific
          // fields), so this derives the slug from the filename — which is
          // also what the app's relativePath-based lookup assumes matches
          // the `slug` field (see getBlogPostQuery in lib/tina-content.ts).
          router: ({ document }) => {
            const [locale, ...slugParts] = document._sys.breadcrumbs;
            return `${localePath(locale as Locale, "/blog")}/${slugParts.join("/")}`;
          },
        },
        fields: [
          { type: "string", name: "title", label: "Title", required: true },
          { type: "string", name: "slug", label: "Slug", required: true },
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
    ],
  },
});
