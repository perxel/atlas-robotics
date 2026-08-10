import {type Collection, defineConfig} from "tinacms";
import {assertSlugFieldsHaveGuard} from "@/cms/slug";
import {seoDashboardScreen, translationDashboardScreen} from "@/lib/cms-server";
import {siteSettingsCollection} from "./collections/site-settings.schema";
import {navCollection} from "./collections/site-nav.schema";
import {footerCollection} from "./collections/site-footer.schema";
import {multilingualCollection} from "./collections/site-multilingual.schema";
import {categoriesCollection} from "./collections/blog-categories.schema";
import {productCategoriesCollection} from "./collections/product-categories.schema";
import {blogCollection} from "./collections/blog.schema";
import {productsCollection} from "./collections/products.schema";
import {pagesCollection} from "./collections/pages.schema";

// Local dev runs fully self-hosted (no Tina Cloud project needed).
// Setting NEXT_PUBLIC_TINA_CLIENT_ID / TINA_TOKEN switches to Tina Cloud.
const branch =
    process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "main";

// Each collection lives in its own tina/collections/*.schema.tsx file
// (per Tina's naming-conventions guide: https://tina.io/docs/guides/naming-conventions),
// composed here. Shared field helpers (seo/draft/slug/taxonomy) live under
// tina/collections/shared-fields/. Block templates live next to their
// render component as components/blocks/<Name>.template.tsx.
const collections: Collection[] = [

    siteSettingsCollection,
    navCollection,
    footerCollection,
    multilingualCollection,
    pagesCollection,
    productsCollection,
    productCategoriesCollection,
    blogCollection,
    categoriesCollection,

];

assertSlugFieldsHaveGuard(collections);

export default defineConfig({
    branch,
    clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || null,
    token: process.env.TINA_TOKEN || null,
    build: {
        outputFolder: "admin",
        publicFolder: "public",
    },
    media: {
        // Repo based media: uploads live in the git repo under public/uploads,
        // not an external provider like Cloudinary/S3.
        tina: {
            mediaRoot: "uploads",
            publicFolder: "public",
        },
    },
    schema: {
        collections,
    },
    cmsCallback: (cms) => {
        // SEO/Translation dashboards call client.queries.* (lib/cms-server.ts) to
        // build their coverage tables. That works fine in local self-hosted dev,
        // but crashes ("Cannot read properties of undefined (reading
        // 'blogConnection')") in the deployed admin: Tina builds its own admin as
        // a separate Vite-bundled SPA (distinct from the Next.js app's webpack
        // build), and in that bundle specifically, TinaClient's constructor
        // (`this.queries = queries(this)`, tinacms/dist/client) ends up leaving
        // `client.queries` undefined at runtime — reproduced live on the
        // deployed dashboards, and matches another TinaCMS user's identical
        // report from custom admin-bundled code
        // (https://github.com/tinacms/tinacms/discussions/4464). Switching these
        // fetchers to client.request() with hand-imported query documents was
        // tried and reverted: it requires a static value import from
        // tina/__generated__/types, which doesn't exist yet on a fresh checkout
        // when the Tina CLI first loads this file to derive the schema (unlike
        // tina/__generated__/client, the CLI writes that one a stub before
        // config load specifically so config.ts can import it — no such stub
        // exists for types.ts) — fails every clean build with "Could not
        // resolve '@/tina/__generated__/types'". Until TinaCMS fixes the
        // underlying bug, only register these in local dev (no clientId), same
        // as Tina Cloud's own "Media Usage" screen already only appearing
        // locally, never on the deployed admin.
        if (!process.env.NEXT_PUBLIC_TINA_CLIENT_ID) {
            if (translationDashboardScreen) cms.plugins.add(translationDashboardScreen);
            cms.plugins.add(seoDashboardScreen);
        }
        return cms;
    },
});
