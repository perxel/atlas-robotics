import type { Template } from "tinacms";

export const ctaTemplate: Template = {
  name: "cta",
  label: "Call To Action",
  fields: [
    { type: "string", name: "heading", label: "Heading" },
    { type: "string", name: "buttonLabel", label: "Button Label" },
    { type: "string", name: "buttonUrl", label: "Button URL" },
  ],
};
