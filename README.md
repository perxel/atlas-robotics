# Atlas Robotics boilerplate

A reusable, two-locale, TinaCMS-driven marketing site boilerplate: Next.js
(App Router + TypeScript), Tailwind v4, TinaCMS with repo-based media, and
Cloudflare Workers as the deploy target (via OpenNext). The demo content
("Atlas Robotics") exercises every piece of the CMS — a products catalog,
a blog with taxonomies, multilingual pages (EN/VI/ZH), and block-based page
editing — so it's ready to fork for a new client project.

For the full architecture guide (i18n, TinaCMS collection conventions,
taxonomies, drafts, visual editing, known deploy issues and their fixes),
see [`CLAUDE.md`](./CLAUDE.md).

## Getting started

```bash
pnpm install
cp .env.example .env.local   # optional for local dev — see below
pnpm dev
```

This starts both the Next.js site (`http://localhost:3000`) and the Tina
admin (`http://localhost:3000/admin/index.html`). Local dev is fully
self-hosted — no Tina Cloud account is needed to start editing content.

## Environment variables

See [`.env.example`](./.env.example). All three are optional in dev and
required in production:

- `NEXT_PUBLIC_TINA_CLIENT_ID` / `TINA_TOKEN` — Tina Cloud project
  credentials (app.tina.io). **Required before any production
  build/deploy** — without them the generated Tina client points at a
  build-time-only localhost server that no longer exists once a real
  visitor hits the site. See "Production builds require Tina Cloud" in
  `CLAUDE.md`.
- `NEXT_PUBLIC_SITE_URL` — canonical site URL, used for the sitemap and
  SEO tags.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server + self-hosted Tina admin |
| `pnpm build` | Production build (Tina indexing + `next build`) |
| `pnpm lint` | ESLint |
| `pnpm preview` | Build and preview the Cloudflare Worker locally |
| `pnpm run deploy` | Build and deploy to Cloudflare Workers |
| `pnpm cf-typegen` | Regenerate Cloudflare env types |
| `pnpm compress-video` | Re-encode/shrink every video in `public/uploads` in place |

`deploy` needs the explicit `run` — pnpm has its own built-in `deploy`
command (for workspace deploys) that otherwise shadows this repo's
same-named script; bare `pnpm deploy` errors with
`ERR_PNPM_CANNOT_DEPLOY` instead of running it.

## Deployment

Deploys to Cloudflare Workers via `@opennextjs/cloudflare`. `wrangler.jsonc`
and `open-next.config.ts` are committed, so this is reproducible from a
clean clone.

**One-time setup:**

1. Create a project at [app.tina.io](https://app.tina.io) and grab its
   Client ID and a token.
2. In the Cloudflare dashboard, set `NEXT_PUBLIC_TINA_CLIENT_ID` and
   `TINA_TOKEN` in **both** places — they're separate steps on Cloudflare,
   and skipping either one breaks the deployed site (see "Production
   builds require Tina Cloud" in `CLAUDE.md`):
   - **Settings → Build → Environment Variables** (needed while building)
   - **Settings → Variables and Secrets** on the deployed Worker, or
     `wrangler secret put TINA_TOKEN` (needed at runtime)
3. In the Cloudflare dashboard, set **Build command** to empty and
   **Deploy command** to `pnpm run deploy` (the explicit `run` matters —
   see the Scripts table above). Leaving Cloudflare's own build step
   enabled makes it auto-detect an unconfigured Next.js project and run
   the entire build twice (see `CLAUDE.md`).

**Every deploy:**

```bash
pnpm run deploy
```

Builds the Worker bundle, excludes `public/uploads` from it (media is
served from Tina Cloud's CDN, not this Worker), then deploys.

**Verify it worked:** after a build, check
`tina/__generated__/client.ts` — it should point at `content.tinajs.io`.
If it says `localhost:4001` instead, the Tina Cloud env vars weren't
picked up at build time.

## License

MIT — see [`LICENSE`](./LICENSE).
