import type { Collection } from "tinacms";

export const formsCollection: Collection = {
  name: "forms",
  label: "Forms",
  path: "content/forms",
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
      name: "contactForm",
      label: "Contact Form",
      description:
        "Labels and placeholders for the contact page form. The fields (name, email, message) are fixed and cannot be added, removed, or reordered here.",
      fields: [
        {
          type: "object",
          name: "name",
          label: "Name Field",
          fields: [
            { type: "string", name: "label", label: "Label" },
            { type: "string", name: "placeholder", label: "Placeholder" },
          ],
        },
        {
          type: "object",
          name: "email",
          label: "Email Field",
          fields: [
            { type: "string", name: "label", label: "Label" },
            { type: "string", name: "placeholder", label: "Placeholder" },
          ],
        },
        {
          type: "object",
          name: "message",
          label: "Message Field",
          fields: [
            { type: "string", name: "label", label: "Label" },
            { type: "string", name: "placeholder", label: "Placeholder" },
          ],
        },
      ],
    },
    {
      type: "object",
      name: "newsletterForm",
      label: "Newsletter Form",
      description:
        "Labels/placeholder for the newsletter signup block on the homepage. The field (email) is fixed and cannot be added, removed, or reordered here.",
      fields: [
        {
          type: "object",
          name: "email",
          label: "Email Field",
          fields: [
            { type: "string", name: "label", label: "Label" },
            { type: "string", name: "placeholder", label: "Placeholder" },
          ],
        },
        { type: "string", name: "submitLabel", label: "Submit Button Label" },
      ],
    },
  ],
};
