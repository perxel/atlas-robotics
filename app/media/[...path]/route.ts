import { getCloudflareContext } from "@opennextjs/cloudflare";

// Proxies Tina Cloud's media CDN (assets.tina.io) so we can stamp our own
// Cache-Control on the response — see cms/media-url.ts for why this exists
// (that CDN serves media with no cache headers at all). Every render call
// site links to /media/... via mediaUrl(), never assets.tina.io directly.
const ORIGIN = "https://assets.tina.io";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// `wrangler types` (cloudflare-env.d.ts) declares CacheStorage.default as an
// ambient `class`, which doesn't merge with lib.dom's `interface CacheStorage`
// the way two `interface` declarations would — so the property isn't visible
// on the global `caches` binding's inferred type even though it exists at
// runtime. Narrowing through this local type once, rather than casting at
// every call site, keeps the rest of the file honestly typed.
function getEdgeCache(): Cache | undefined {
  if (typeof caches === "undefined") return undefined;
  return (caches as CacheStorage & { default: Cache }).default;
}

// Headers worth mirroring from the origin response. Deliberately not a
// blanket passthrough of every origin header — assets.tina.io is a Cloudflare-fronted
// origin whose own edge/CDN headers (age, cf-ray, its own cache-control, etc.)
// don't mean anything once relayed from a different Worker.
const FORWARDED_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag"];

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const { search } = new URL(request.url);
  const originUrl = `${ORIGIN}/${path.map(encodeURIComponent).join("/")}${search}`;

  // Range requests (video seeking) are proxied straight through and never
  // cached at the edge here — caching a 206 under the same key as the full
  // 200 response would serve a partial body to a request that asked for the
  // whole file. The browser's own Cache-Control-driven cache still covers
  // repeat full-file loads; only the edge layer skips range requests.
  const range = request.headers.get("range");
  const edgeCache = getEdgeCache();
  const cacheKey = edgeCache ? new Request(originUrl, { method: "GET" }) : undefined;

  if (!range && cacheKey && edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

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

  const response = new Response(originResponse.body, {
    status: originResponse.status,
    headers,
  });

  if (!range && cacheKey && edgeCache && originResponse.status === 200) {
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
  }

  return response;
}
