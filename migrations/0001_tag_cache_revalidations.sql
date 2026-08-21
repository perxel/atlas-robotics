-- Backs @opennextjs/cloudflare's D1NextModeTagCache (open-next.config.ts's
-- `tagCache: d1NextTagCache`). Without this table, revalidateTag()/
-- revalidatePath() (app/api/revalidate/route.ts) has nowhere to record that
-- a tag changed, so the R2 incremental cache keeps serving stale CMS reads
-- until the Worker restarts — not a startup error, just a silent no-op
-- (D1NextModeTagCache.getConfig() falls back to isDisabled when the table/
-- binding isn't there).
--
-- Schema must match exactly what node_modules/@opennextjs/cloudflare's
-- d1-next-tag-cache.js queries: `SELECT/INSERT tag, revalidatedAt, stale,
-- expire`. Confirmed against that file directly, not just docs (the docs
-- page for this feature doesn't publish the migration SQL at all).
CREATE TABLE IF NOT EXISTS revalidations (
  tag TEXT NOT NULL,
  revalidatedAt INTEGER NOT NULL,
  stale INTEGER,
  expire INTEGER DEFAULT NULL,
  UNIQUE(tag) ON CONFLICT REPLACE
);
