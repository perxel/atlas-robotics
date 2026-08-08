import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "../globals.css";
import { locales, defaultLocale, isLocale, localePath, stripLocalePrefix, CMSDictionary, CMSSeo, siteUrl } from "@/lib/cms";
import { getSiteSettings } from "@/lib/tina-content";
import { translateText } from "@/cms/multilingual";
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
  const pathWithoutLocale = stripLocalePrefix(pathname);
  const [settings, uiDictionary] = await Promise.all([getSiteSettings(locale), CMSDictionary.loadMap(locale)]);

  return {
    metadataBase: new URL(siteUrl),
    icons: settings?.favicon ? { icon: settings.favicon } : undefined,
    ...CMSSeo.buildMetadata({
      lang: locale,
      pathWithoutLocale,
      seo: settings?.defaultSeo,
      fallbackTitle: settings?.title || translateText(uiDictionary, "Lorem ipsum"),
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
        <main className="flex-1">
          <ViewTransition>{children}</ViewTransition>
        </main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
