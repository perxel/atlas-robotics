import type { Template } from "tinacms";

// One block, three modes, so editors get a real choice instead of a
// separate near-duplicate "featured products" block:
// - "latest": most recently published products, capped at `productsToShow`
//   (e.g. a homepage teaser section).
// - "manual": editor hand-picks specific products via `manualProducts`
//   (e.g. spotlighting a launch regardless of publish order).
// - "all": the full catalog, paginated — this is what backs the locked
//   /products listing page (see lib/cms-server.ts).
// `heading` is optional, like every other block-level field now (see
// BlocksRenderer.tsx's top comment on why no block field is ever marked
// `required: true`) — for "all" mode, editors can just repeat the page
// title or use something like "All Products" if they want one, but
// nothing renders a broken page if they don't.
export const productListingTemplate: Template = {
  name: "productListing",
  label: "Product Listing",
  fields: [
    { type: "string", name: "heading", label: "Heading" },
    {
      type: "string",
      name: "subheading",
      label: "Subheading",
      description: "Optional short note shown above the product grid.",
    },
    {
      type: "string",
      name: "mode",
      label: "Mode",
      options: [
        { value: "latest", label: "Latest products" },
        { value: "manual", label: "Hand-picked products" },
        { value: "all", label: "All products (paginated)" },
      ],
    },
    {
      type: "number",
      name: "productsToShow",
      label: "Number of Products to Show",
      description: 'Used in "Latest products" mode. Defaults to 3.',
    },
    {
      type: "object",
      name: "manualProducts",
      label: "Hand-Picked Products",
      description: 'Used in "Hand-picked products" mode.',
      list: true,
      ui: {
        itemProps: (item: { product?: string }) => ({
          label: item?.product?.split("/").pop()?.replace(/\.md$/, "") || "Product",
        }),
      },
      fields: [
        {
          type: "reference",
          name: "product",
          label: "Product",
          collections: ["products"],
        },
      ],
    },
  ],
};
