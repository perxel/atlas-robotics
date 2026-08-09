import type { Collection } from "tinacms";

export const navCollection: Collection = {
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
};
