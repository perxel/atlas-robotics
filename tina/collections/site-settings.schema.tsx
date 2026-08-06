import type { Collection } from "tinacms";
import { seoField } from "./shared-fields/seo.schema";

export const siteSettingsCollection: Collection = {
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
};
