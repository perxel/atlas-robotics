import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// No `queue` override: that's only needed for time-based revalidation
// (`next: { revalidate: <seconds> }`). lib/cms-server.ts's CMS reads are
// cached indefinitely (`cache: "force-cache"`) and only invalidated
// on-demand via revalidateTag("cms") from app/api/revalidate/route.ts, so
// there's nothing for a queue to schedule. See
// https://opennext.js.org/cloudflare/caching.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
});
