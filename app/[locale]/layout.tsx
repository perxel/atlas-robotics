import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "../globals.css";
import { CMSDictionary, CMSSeo, getSiteSettings } from "@/lib/cms-server";
import { locales, defaultLocale, CMSMultilingual } from "@/lib/registry";
import { siteUrl } from "@/cms/seo";
import { translateText } from "@/cms/multilingual";
import Header from "@/components/Header";
import HeaderSkeleton from "@/components/HeaderSkeleton";
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
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || CMSMultilingual.localePath(locale, "/");
  const pathWithoutLocale = CMSMultilingual.stripLocalePrefix(pathname);
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
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Every page's LCP candidate (hero/cover image or video) is
            served from Tina Cloud's asset CDN, not this origin — warming
            up DNS/TLS to it before the browser discovers the actual media
            URL shaves that connection setup off the LCP critical path. */}
        <link rel="preconnect" href="https://assets.tina.io" />
      </head>
      <body className="flex min-h-full flex-col">
        {/* Header awaits 5 CMS calls (nav, settings, alternates, multilingual,
            dictionary) before it can render anything. Without this boundary,
            Next.js won't flush *any* HTML for the route until Header resolves —
            confirmed live, the document response alone was ~1.4s with zero
            bytes sent to the browser in that window. Suspense lets the shell +
            this fallback stream immediately instead. Doesn't touch LCP: {children}
            (the hero) is a separate, still-unwrapped async subtree, so the
            overall response is still gated on whichever of the two is slower —
            this only changes when the header itself becomes visible. */}
        <Suspense fallback={<HeaderSkeleton />}>
          <Header locale={locale} />
        </Suspense>
        <main className="flex-1">
          <ViewTransition>{children}</ViewTransition>
        </main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
