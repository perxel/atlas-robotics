import type { Template } from "tinacms";

export const newsletterTemplate: Template = {
  name: "newsletter",
  label: "Newsletter Signup",
  fields: [
    { type: "string", name: "heading", label: "Heading", required: true },
    { type: "string", name: "subheading", label: "Subheading" },
  ],
};
