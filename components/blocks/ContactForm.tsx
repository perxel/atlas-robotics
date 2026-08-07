"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

export type ContactFormFieldCopy = {
  label?: string | null;
  placeholder?: string | null;
};

export type ContactFormCopy = {
  name?: ContactFormFieldCopy | null;
  email?: ContactFormFieldCopy | null;
  message?: ContactFormFieldCopy | null;
  submitLabel?: string | null;
};

export default function ContactForm({
  locale,
  fields,
}: {
  locale: Locale;
  fields?: ContactFormCopy | null;
}) {
  const dict = getDictionary(locale).contact;
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  function handleChange(name: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      setValues({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          {fields?.name?.label || dict.fields.name.label}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder={fields?.name?.placeholder || dict.fields.name.placeholder}
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          {fields?.email?.label || dict.fields.email.label}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder={fields?.email?.placeholder || dict.fields.email.placeholder}
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-foreground">
          {fields?.message?.label || dict.fields.message.label}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder={fields?.message?.placeholder || dict.fields.message.placeholder}
          value={values.message}
          onChange={(e) => handleChange("message", e.target.value)}
          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? dict.sending : fields?.submitLabel || dict.send}
      </button>

      {status === "success" && <p className="text-sm text-accent">{dict.success}</p>}
      {status === "error" && <p className="text-sm text-red-600">{dict.error}</p>}
    </form>
  );
}
