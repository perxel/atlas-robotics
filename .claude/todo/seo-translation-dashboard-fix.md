# Fix: SEO Score / Translation dashboards crash on deployed admin

## Status: in progress, uncommitted — resume here tomorrow

## The bug

On the deployed Cloudflare admin (`/admin/#/screens/seo_score`), both custom
dashboard screens crash on load:

```
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'blogConnection')
    at fetchEdges → ... → getSeoIndex → getAudit/getCoverage
```

Confirmed **not** a Tina Cloud config/schema/deploy issue — the live `/blog`
page renders real content fine, and Tina's own built-in admin (auth, document
editing) works fine. It's isolated to code that calls
`client.queries.<name>()` (the generated Tina SDK helper) from within
`lib/cms-server.ts`, when that code runs inside **Tina's own admin app**,
which Tina builds as a separate Vite-bundled SPA (`tinacms build`'s
`buildProductionSpa`) — distinct from the Next.js app's webpack build.

### Root cause (confirmed via live forensics + external corroboration)

`TinaClient`'s constructor (`tinacms/dist/client`, aka `unifiedClient`) does:

```js
this.queries = queries(this); // queries is a factory fn from tina/__generated__/types.js
```

In the Vite-bundled admin specifically, `client.queries` ends up `undefined`
at runtime. Verified live by monkey-patching `fetch` and
`Response.prototype.json` on the deployed admin: **zero network requests are
ever attempted** before the crash — so the throw happens synchronously at
`client.queries.blogConnection` (property access on `undefined`), not inside
a `.then()` on a resolved response.

Matches an identical report from another TinaCMS user hitting
`client.queries.personConnection()` from custom admin-bundled code:
https://github.com/tinacms/tinacms/discussions/4464 — their fix was the same
one attempted here: stop calling `client.queries.*`, use `client.request()`
directly instead (a plain instance method, no factory step, works under both
bundlers).

## First attempt (pushed, then broke the build — now reverted in working tree)

Commit `3d0bcd6` (pushed to `main`) changed `lib/cms-server.ts`'s
`fetchEdges`/`fetchTerms`/`fetchConnection`/`fetchEntries` to use
`client.request({query: <Name>Document}, {})` with **value imports** of the
generated `*Document` query-string constants from `tina/__generated__/types`.

**This broke the Cloudflare build**, independent of the original bug:

```
lib/cms-server.ts:9:7: ERROR: Could not resolve "@/tina/__generated__/types"
errorCode: 'ERR_CONFIG_LOAD_FAILED'
```

Reproduced locally by moving `tina/__generated__/` aside and running
`npx tinacms build --local --skip-cloud-checks --skip-indexing`.

**Why**: `tina/config.ts` imports `lib/cms-server.ts` (for
`seoDashboardScreen`/`translationDashboardScreen`). The Tina CLI's *first*
step is to load/bundle `tina/config.ts` (via esbuild) just to **extract the
schema** — before `tina/__generated__/types.ts` exists (it's generated
*from* that schema, later in the same run). `tina/__generated__/client.ts`
survives this because the CLI writes a stub for it specifically
(`export const client = ()=>({})`) before config-load
(`node_modules/@tinacms/cli/dist/index.js` ~line 1188). **No such stub
exists for `types.ts`** — any static (or dynamic — tested, same failure,
esbuild resolves `import()` eagerly too, see below) value import of it from
`lib/cms-server.ts` fails on a truly fresh checkout (empty `tina/__generated__/`,
which is what CI always starts from — it's gitignored).

Tested and ruled out: wrapping the import as `await import("@/tina/__generated__/types")`
— **still fails the same way**, esbuild resolves dynamic import specifiers
eagerly during this bundling pass too (confirmed by reproducing locally).
Also ruled out hiding the specifier from static analysis entirely (e.g. via
`new Function('s','return import(s)')`) — that would dodge the CLI's
config-load bundler, but it would *also* dodge Vite's/webpack's real
production bundling of the same import, meaning the module wouldn't be
included in the actual deployed bundle either — trades one failure for a
worse one (`@/` path aliases only resolve because the bundler sees the
specifier statically; a real e2e-working fix can't hide it from every
bundler at once).

**Action needed tomorrow**: decide whether to `git revert 3d0bcd6` on
`origin/main` (the deployed build is currently broken until this is fixed
one way or another — the push happened before this discovery).

## Current uncommitted working-tree state

- `lib/cms-server.ts` — reverted back to the original (pre-`3d0bcd6`)
  content: `client.queries.*` everywhere, exactly as before this session.
  Verified against `git show c5a8390:lib/cms-server.ts`.
- `tina/config.ts` — **new**, uncommitted change: gates
  `cms.plugins.add(seoDashboardScreen)` /
  `cms.plugins.add(translationDashboardScreen)` behind
  `!process.env.NEXT_PUBLIC_TINA_CLIENT_ID`, i.e. only registers the two
  dashboards in local self-hosted dev, never in the deployed (Tina Cloud)
  admin. This is a **fallback / stopgap the user asked for as a "if we can't
  fix it properly, at least don't ship a crash"** option (precedent cited:
  Tina Cloud's own "Media Usage" screen already only appears locally, not on
  deploy). Verified this variant builds cleanly from a simulated fresh
  checkout (`rm -rf tina/__generated__` + local build, twice: once with no
  `NEXT_PUBLIC_TINA_CLIENT_ID` set, once with a dummy one set to sanity-check
  the branch condition itself — real Tina Cloud auth wasn't exercised, no
  credentials available locally).

**But the user pushed back on this fallback** ("why? because these dashboard
is very helpful to user!") — correctly: hiding the dashboards in production
is a real loss of functionality, not a real fix. Mid-investigation into a
better option when the session paused. Do **not** just commit the
`tina/config.ts` gating change as the final answer without first trying the
real fix below.

## The real fix to try tomorrow: `fetchSeoIndex`-style override, hand-written minimal queries

Key finding: `CollectionRegistryEntry` (`cms/collection/types.ts`) **already
has a dedicated, optional override slot exactly for this**:

```ts
/** Optional override for the SEO dashboard's per-document index; when omitted,
 * getSeoIndex() falls back to reading `.seo`/`.slug` off fetchEdges()'s own results. */
fetchSeoIndex?: () => Promise<Array<Edge<unknown>> | null | undefined>;
```

`CollectionService.getSeoIndex()` (`cms/collection/CollectionService.ts`)
already does `(entry.fetchSeoIndex ?? entry.fetchEdges)()` — i.e. the
framework *already anticipated* wanting a lighter/different query just for
the dashboard, separate from `fetchEdges` (which stays on
`client.queries.blogConnection()` — full field set, needed for real listing
pages, and that call path is **never exercised inside the Vite admin bundle
today** since nothing in the admin's own UI calls `fetchEdges` directly —
only the dashboards do, via `getSeoIndex`/`getCoverage`/`getAudit`, and only
because `lib/cms-server.ts` doesn't currently define `fetchSeoIndex` so it
falls back to `fetchEdges`).

**Plan**: define `fetchSeoIndex` for `blog` and `products` in
`collectionRegistry` (`lib/cms-server.ts`), implemented with
`client.request()` and a **hand-written, minimal, literal GraphQL query
string** (not imported from any generated file — sidesteps the chicken-egg
problem entirely, since it's just a string this file owns). Only needs the
fields `getSeoIndex()`/`SeoDashboardService` actually read: `slug`, `seo
{metaTitle metaDescription ogImage ogImageAlt}`, `title`, `excerpt`, `draft`,
`_sys {relativePath breadcrumbs}` — a much smaller, more stable surface than
the full card-rendering field set `fetchEdges`/`BlogConnectionDocument`
carries (title/excerpt/slug/seo/draft/_sys are foundational fields unlikely
to churn when someone adds e.g. a new hero image field).

**Still need to work out before implementing** (session paused here):

1. **Taxonomies** (`categories`/`productCategories`) — `TaxonomyRegistryEntry`
   (`cms/taxonomy/types.ts`) has **no** `fetchSeoIndex`-equivalent slot today,
   only `fetchTerms`, used both for real archive pages *and* (implicitly) by
   whatever the SEO dashboard does for taxonomy coverage. Need to check
   `cms/taxonomy/TaxonomyService.ts`'s SEO-index method (or wherever
   `SeoDashboardService`'s `getSeoIndex` deps route taxonomy collections —
   `SeoDashboardService` takes a single `getSeoIndex(collectionName)` that's
   wired in `cms/create-dashboards.ts`, presumably branching per source type)
   and, if needed, add a matching optional `fetchSeoIndex` override there too
   — same pattern, not a new one.
2. **Pages** (`pagesConfig.fetchConnection`) — same tension: used for both
   real page routing/alternates *and* whatever the SEO dashboard's "pages"
   row needs. Check `cms/pages/PagesService.ts` for how/whether it exposes an
   SEO-index equivalent, and `cms/pages/types.ts`'s `PagesDeps` for whether a
   `fetchSeoIndex`-style slot needs adding there too.
3. **Translation dashboard** — reads `getItemLocaleIndex(collectionName)`
   (`CollectionService.ts`), which itself calls `entry.fetchEdges()` (not
   `fetchSeoIndex`) and only reads `_sys.relativePath`/`_sys.breadcrumbs` off
   each edge. Same fix shape applies (needs its own minimal query, or could
   it reuse the *same* `fetchSeoIndex` result rather than needing a third
   variant, since `_sys` is a subset of what the SEO index query would already
   select?) — worth checking whether `getItemLocaleIndex` can be pointed at
   `fetchSeoIndex` too (via `entry.fetchSeoIndex ?? entry.fetchEdges`, same
   fallback CollectionService.getSeoIndex already uses) instead of inventing
   a fourth registry method. Also check `dictionaryConfig.fetchEntries`
   (multilingual UI strings, `client.queries.multilingual(...)`) — does the
   translation dashboard need this, or only `getItemLocaleIndex` per
   collection? Read `createTranslationDashboardScreen.tsx` /
   `create-dashboards.ts` wiring to confirm exactly which registry methods
   the translation dashboard actually touches before assuming.
4. Once the full set of needed `fetchSeoIndex`-style overrides is known,
   implement them in `lib/cms-server.ts` with hand-written query strings,
   **revert the `tina/config.ts` gating change** (no longer needed — the
   dashboards will work in production for real), re-verify with the same
   local fresh-checkout build test used above
   (`rm -rf tina/__generated__ && npx tinacms build --local --noTelemetry
   --skip-indexing --skip-cloud-checks --datalayer-port <free-port>`), then
   `tsc --noEmit` + `eslint`, commit, and push.
5. **`git revert 3d0bcd6`** (or amend/force-fix forward) is needed regardless
   of which path is chosen, since that commit is currently live on
   `origin/main` and breaks the Cloudflare build — this should probably
   happen *first* tomorrow, before anything else, so the deploy pipeline
   isn't broken while the real fix is worked out.

## Useful commands for next session

- Reproduce the exact CI failure locally (fresh-checkout simulation):
  ```
  mv tina/__generated__ /tmp/generated-backup
  npx tinacms build --local --noTelemetry --skip-indexing --skip-cloud-checks --datalayer-port 9098
  ```
  (`--datalayer-port` avoids colliding with the already-running `npm run dev`
  on port 9000/4001 — check with `lsof -nP -iTCP:9000 -sTCP:LISTEN` first.)
- Local admin needs the explicit file, not the directory (a middleware/routing
  quirk in local `next dev` only — `/admin/` and bare `/admin` both get
  intercepted and render the homepage instead; doesn't happen on the real
  Cloudflare deploy, static-asset serving there bypasses middleware
  entirely): `http://localhost:3000/admin/index.html#/`.
- A local self-hosted (`--local`) production admin build still shows Tina's
  real Cloud login gate and can't actually authenticate without real
  credentials — couldn't click through the SEO dashboard UI end-to-end
  locally for that reason. Verified the request-construction side instead by
  posting the exact query manually:
  ```js
  await fetch('http://localhost:4001/graphql', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({query: '<the query text>', variables: {}})
  }).then(r => r.json())
  ```
