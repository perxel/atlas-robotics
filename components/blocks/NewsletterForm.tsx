"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

export default function NewsletterForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).newsletter;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          {dict.emailLabel}
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder={dict.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full flex-1 rounded border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 rounded bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {status === "submitting" ? dict.sending : dict.submitLabel}
        </button>
      </form>

      {status === "success" && <p className="mt-3 text-sm text-accent">{dict.success}</p>}
      {status === "error" && <p className="mt-3 text-sm text-red-600">{dict.error}</p>}
    </div>
  );
}
