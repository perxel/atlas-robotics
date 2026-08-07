import type { Template } from "tinacms";

// No `heading` field — same reasoning as ContactFormBlock.template.tsx:
// the page's own title already covers it, and a `heading` field here would
// collide at the GraphQL level with the required `heading` other block
// templates declare.
export const blogListingTemplate: Template = {
  name: "blogListing",
  label: "Blog Listing",
  fields: [
    {
      type: "string",
      name: "subheading",
      label: "Note",
      description: "Optional short note shown above the post grid.",
    },
  ],
};
