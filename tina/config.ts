import { defineConfig, type Collection } from "tinacms";
import { assertSlugFieldsHaveGuard } from "@/cms/slug";
import { translationDashboardScreen, seoDashboardScreen } from "@/lib/dashboards";
import { siteSettingsCollection } from "./collections/site-settings.schema";
import { navCollection } from "./collections/nav.schema";
import { footerCollection } from "./collections/footer.schema";
import { multilingualCollection } from "./collections/multilingual.schema";
import { categoriesCollection } from "./collections/categories.schema";
import { productCategoriesCollection } from "./collections/product-categories.schema";
import { blogCollection } from "./collections/blog.schema";
import { productsCollection } from "./collections/products.schema";
import { pagesCollection } from "./collections/pages.schema";

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
  categoriesCollection,
  productCategoriesCollection,
  blogCollection,
  productsCollection,
  pagesCollection,
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
    if (translationDashboardScreen) cms.plugins.add(translationDashboardScreen);
    cms.plugins.add(seoDashboardScreen);
    return cms;
  },
});
