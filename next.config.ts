import type { NextConfig } from "next";

// Locale-specific section slugs (see lib/section-slugs.ts) need both an
// internal rewrite — so the translated URL actually renders that section's
// route, since route folders under app/[locale]/ are physical, literal
// names — and a redirect off the untranslated /vi/<english-segment> URL,
// so there's only ever one canonical URL per locale (same principle
// middleware.ts already applies to the default-locale prefix). Only vi
// needs entries here: en's segments already match the physical folder
// names verbatim, so there's nothing to translate or redirect for it.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/vi/blog", destination: "/vi/tin-tuc", permanent: true },
      { source: "/vi/blog/:path*", destination: "/vi/tin-tuc/:path*", permanent: true },
      { source: "/vi/products", destination: "/vi/san-pham", permanent: true },
      { source: "/vi/products/:path*", destination: "/vi/san-pham/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/vi/tin-tuc", destination: "/vi/blog" },
      { source: "/vi/tin-tuc/:path*", destination: "/vi/blog/:path*" },
      { source: "/vi/san-pham", destination: "/vi/products" },
      { source: "/vi/san-pham/:path*", destination: "/vi/products/:path*" },
    ];
  },
};

export default nextConfig;
