import type { Metadata } from "next";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getForms, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import ContactForm from "@/components/contact/ContactForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/contact");
  const settings = await getSiteSettings(locale);
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    fallbackTitle: `${dict.contact.pageTitle} — ${settings?.title || dict.siteName}`,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const forms = await getForms(locale);
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{dict.contact.pageTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{dict.contact.pageDescription}</p>

      <div className="mt-8">
        <ContactForm locale={locale} fields={forms?.contactForm} />
      </div>
    </div>
  );
}
