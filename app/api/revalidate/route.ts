import { revalidateTag } from "next/cache";

// Invalidates the "cms" tag every CMS read in lib/cms-server.ts is cached
// under (see CMS_FETCH_OPTIONS there) — the on-demand counterpart to that
// indefinite `cache: "force-cache"`. Triggered by
// .github/workflows/revalidate.yml on push to content/**, the one path
// Cloudflare's own build-watch-paths config excludes from triggering a
// redeploy (Settings → Build). Secret-gated because this is a public URL on
// the live domain — unauthenticated, anyone hitting it repeatedly could
// keep the cache permanently cold.
export async function POST(req: Request) {
  const secret = req.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // { expire: 0 } (not the "max" profile) — Next 16's own docs call this out
  // as the pattern for exactly this case: a webhook/external caller that
  // needs the tag to expire immediately, not stale-while-revalidate.
  revalidateTag("cms", { expire: 0 });
  return Response.json({ revalidated: true, now: Date.now() });
}
