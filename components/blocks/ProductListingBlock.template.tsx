import type { Template } from "tinacms";

// No `heading` field — same reasoning as ContactFormBlock.template.tsx:
// the page's own title already covers it, and a `heading` field here would
// collide at the GraphQL level with the required `heading` other block
// templates declare.
export const productListingTemplate: Template = {
  name: "productListing",
  label: "Product Listing",
  fields: [
    {
      type: "string",
      name: "subheading",
      label: "Note",
      description: "Optional short note shown above the product grid.",
    },
  ],
};
