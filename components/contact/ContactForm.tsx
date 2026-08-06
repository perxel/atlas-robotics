"use client";

import { useState } from "react";
import { slugify } from "@/lib/slugify";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

export type ContactFormFieldConfig = {
  id: string;
  label: string;
  fieldType?: string | null;
  required?: boolean | null;
};

export default function ContactForm({
  fields,
  locale,
}: {
  fields: ContactFormFieldConfig[];
  locale: Locale;
}) {
  const dict = getDictionary(locale).contact;
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  function handleChange(name: string, value: string) {
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
      setValues({});
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map((field) => {
        const name = slugify(field.label) || field.id;
        const value = values[name] || "";

        return (
          <div key={field.id}>
            <label htmlFor={name} className="block text-sm font-medium text-foreground">
              {field.label}
              {field.required ? " *" : ""}
            </label>
            {field.fieldType === "textarea" ? (
              <textarea
                id={name}
                name={name}
                required={!!field.required}
                value={value}
                onChange={(e) => handleChange(name, e.target.value)}
                rows={5}
                className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            ) : (
              <input
                id={name}
                name={name}
                type={field.fieldType || "text"}
                required={!!field.required}
                value={value}
                onChange={(e) => handleChange(name, e.target.value)}
                className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? dict.sending : dict.send}
      </button>

      {status === "success" && <p className="text-sm text-accent">{dict.success}</p>}
      {status === "error" && <p className="text-sm text-red-600">{dict.error}</p>}
    </form>
  );
}
