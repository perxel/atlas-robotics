import type { Collection } from "tinacms";
import { draftField } from "./shared-fields/draft.schema";
import { seoField } from "./shared-fields/seo.schema";

export const catalogCollection: Collection = {
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
};
