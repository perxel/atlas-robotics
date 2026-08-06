import type { Collection } from "tinacms";

export const footerCollection: Collection = {
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
};
