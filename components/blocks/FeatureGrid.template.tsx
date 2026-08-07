import type { Template } from "tinacms";

// A generic "heading + grid of icon/title/description items" block, reused
// on the homepage both as the USP section ("Why choose us") and the Key
// Features section — same shape, different copy, so one block type rather
// than two near-identical ones.
export const featureGridTemplate: Template = {
  name: "featureGrid",
  label: "Feature Grid",
  fields: [
    { type: "string", name: "heading", label: "Heading", required: true },
    { type: "string", name: "subheading", label: "Subheading" },
    {
      type: "object",
      name: "items",
      label: "Items",
      list: true,
      ui: {
        itemProps: (item) => ({ label: item?.title || "Item" }),
      },
      fields: [
        {
          type: "string",
          name: "icon",
          label: "Icon",
          description: "A single emoji, e.g. ⚡",
        },
        { type: "string", name: "title", label: "Title", required: true },
        {
          type: "string",
          name: "description",
          label: "Description",
          ui: { component: "textarea" },
        },
      ],
    },
  ],
};
