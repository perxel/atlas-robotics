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
    // own /uploads path — confirmed live, not assumed. next/image needs the
    // remote host allow-listed to fetch/optimize images loaded from there.
    //
    // Deliberately still the raw assets.tina.io host, NOT this app's own
    // /media/[...path] proxy (cms/media-url.ts) — next/image's optimizer
    // fetches its `src` itself via Cloudflare's Images binding
    // (wrangler.jsonc's `images.binding`), and pointing that at a
    // same-origin /media/... path makes the Images binding call back into
    // this same Worker to resolve it — a self-referencing fetch that broke
    // production twice (see CLAUDE.md's "Media URLs" section). Every
    // next/image `<Image>` render (CoverMedia.tsx, Hero.tsx) intentionally
    // passes the raw Tina URL, unproxied; only plain <video>/<img> tags and
    // the favicon route through /media/....
    remotePatterns: [{ protocol: "https", hostname: "assets.tina.io" }],
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
