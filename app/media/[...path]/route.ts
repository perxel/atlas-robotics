// Proxies Tina Cloud's media CDN (assets.tina.io) so we can stamp our own
// Cache-Control on the response — see cms/media-url.ts for why this exists
// (that CDN serves media with no cache headers at all). Every render call
// site links to /media/... via mediaUrl(), never assets.tina.io directly.
//
// Deliberately NOT using Cloudflare's caches.default Cache API here (an
// earlier version did) — this route runs as a Next.js Route Handler on the
// Node.js runtime under opennextjs-cloudflare, and that combination started
// throwing on every fresh (non-edge-cached) request in production shortly
// after deploy, spiking Worker error rates from <150 to 1.25k. Root cause
// unconfirmed (no stack trace was available), but caches.default was the one
// piece of that version that couldn't be typed against this project's
// ambient Cloudflare types without a cast — a real signal its runtime shape
// didn't match what was assumed. It also wasn't required: the Cache-Control
// header below is what Lighthouse's "efficient cache lifetimes" check
// actually needs, and Cloudflare's own zone edge cache (plus every visitor's
// browser) already honors it with no custom caching code. Re-introduce
// edge-side caching only with a confirmed-working pattern, verified against
// real production logs first.
const ORIGIN = "https://assets.tina.io";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// Headers worth mirroring from the origin response. Deliberately not a
// blanket passthrough of every origin header — assets.tina.io is a Cloudflare-fronted
// origin whose own edge/CDN headers (age, cf-ray, its own cache-control, etc.)
// don't mean anything once relayed from a different Worker.
const FORWARDED_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag"];

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const { search } = new URL(request.url);
  const originUrl = `${ORIGIN}/${path.map(encodeURIComponent).join("/")}${search}`;

  const range = request.headers.get("range");
  const originResponse = await fetch(originUrl, {
    headers: range ? { Range: range } : undefined,
  });

  if (!originResponse.ok) {
    return new Response(originResponse.body, { status: originResponse.status });
  }

  const headers = new Headers();
  for (const key of FORWARDED_HEADERS) {
    const value = originResponse.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("Cache-Control", CACHE_CONTROL);

  return new Response(originResponse.body, {
    status: originResponse.status,
    headers,
  });
}
