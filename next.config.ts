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
  // Repo-based media (see CLAUDE.md's "TinaCMS" section) is synced to and
  // served from TinaCloud's asset CDN in production, not from this app's own
  // /uploads path — confirmed live, not assumed (zero requests hit this
  // Worker's own domain for media). That CDN sends no Cache-Control at all
  // (flagged by Lighthouse's "efficient cache lifetimes"), and we don't
  // control its response headers, so cms/media-url.ts's mediaUrl() rewrites
  // every render site to /media/[...path] (app/media/[...path]/route.ts)
  // instead of linking to assets.tina.io directly — that route proxies the
  // fetch and stamps a long-lived Cache-Control on the way back out.
  // next/image never receives a raw assets.tina.io URL anymore (it's always
  // /media/... or, locally, /uploads/...), so no images.remotePatterns entry
  // is needed for that host.
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
