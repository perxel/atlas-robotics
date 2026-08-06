import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "../globals.css";
import { locales, defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale, siteUrl } from "@/lib/seo";
import { getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/");
  const pathWithoutLocale = stripLocale(pathname);
  const settings = await getSiteSettings(locale);
  const dict = getDictionary(locale);

  return {
    metadataBase: new URL(siteUrl),
    icons: settings?.favicon ? { icon: settings.favicon } : undefined,
    ...buildMetadata({
      locale,
      pathWithoutLocale,
      seo: settings?.defaultSeo,
      fallbackTitle: settings?.title || dict.siteName,
    }),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
