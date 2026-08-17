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
  // Off by default, so production chunks ship with no accompanying .map —
  // Lighthouse flags this and it also blocks reading real stack traces from
  // prod error reports. The .map files land in .open-next/assets next to
  // their chunks and opennextjs-cloudflare uploads them as static assets
  // like any other file, so no separate wiring is needed on the Cloudflare
  // side.
  productionBrowserSourceMaps: true,
  images: {
    // Repo-based media (see CLAUDE.md's "TinaCMS" section) is synced to and
    // served from TinaCloud's asset CDN in production, not from this app's
    // own /uploads path — confirmed live, not assumed (zero requests hit
    // this Worker's own domain for media). next/image needs the remote
    // host allow-listed to optimize images loaded from there.
    remotePatterns: [{ protocol: "https", hostname: "assets.tina.io" }],
    formats: ["image/avif", "image/webp"],
    // Next's default is `[75]` only — Hero.tsx's hand-built poster URL
    // (`/_next/image?...&q=50`) deliberately asks for a lower quality than
    // that, since it's just a placeholder shown before the video paints, so
    // 50 has to be explicitly allow-listed or every poster request 400s.
    qualities: [50, 75],
  },
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

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
