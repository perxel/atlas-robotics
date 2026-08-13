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
npm install
cp .env.example .env.local   # optional for local dev — see below
npm run dev
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
| `npm run dev` | Next.js dev server + self-hosted Tina admin |
| `npm run build` | Production build (Tina indexing + `next build`) |
| `npm run lint` | ESLint |
| `npm run preview` | Build and preview the Cloudflare Worker locally |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
| `npm run cf-typegen` | Regenerate Cloudflare env types |

## Deployment

Deploys to Cloudflare Workers via `@opennextjs/cloudflare`. `npm run
deploy` builds and deploys in one step — `wrangler.jsonc` and
`open-next.config.ts` are committed so this is reproducible from a clean
clone. Set `NEXT_PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN` in the Cloudflare
dashboard under **both** Build and Worker runtime environment variables
(they're separate steps on Cloudflare) — see `CLAUDE.md` for why both are
needed.

## License

MIT — see [`LICENSE`](./LICENSE).
