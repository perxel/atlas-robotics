const TINA_ASSETS_HOST = "assets.tina.io";

/**
 * Tina Cloud's asset CDN (assets.tina.io) serves repo-based media in
 * production with no Cache-Control header at all (confirmed via Lighthouse
 * — "efficient cache lifetimes" flagged ~32MB of video/image transfer with
 * no cache TTL). We don't control that host's response headers, so instead
 * every Tina media URL is rewritten to route through this app's own
 * /media/[...path] proxy (see that route for the actual caching), which
 * fetches from assets.tina.io but sets a long-lived Cache-Control on the
 * way back out. No dependencies — this file must stay importable from
 * client components (LanguageSwitcher.tsx) that deliberately avoid
 * lib/cms-server.ts to keep the generated Tina client out of the client
 * bundle.
 *
 * Locally (`next dev`), Tina resolves media fields to a relative
 * `/uploads/...` path instead, which is already same-origin — `new URL()`
 * throws on a relative string with no base, so those pass through
 * unchanged via the catch below.
 */
export function mediaUrl<T extends string | null | undefined>(src: T): T {
  if (!src) return src;
  try {
    const url = new URL(src);
    if (url.hostname !== TINA_ASSETS_HOST) return src;
    return (`/media${url.pathname}${url.search}`) as T;
  } catch {
    return src;
  }
}
