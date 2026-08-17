import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// New site — not yet cut over to its custom domain (www.gobrain.org). deploy.yml sets
// GITHUB_PAGES_PROJECT_PREVIEW so the site works at its GitHub Pages project URL,
// https://brusergroups.github.io/brain-pages/, which needs a /brain-pages base path.
// Once DNS is cut over and the custom domain is set on BRUserGroups/brain-pages,
// remove that env var from deploy.yml — no changes needed here.
const isProjectPagesPreview = process.env.GITHUB_PAGES_PROJECT_PREVIEW === 'true';

export default defineConfig({
  site: isProjectPagesPreview ? 'https://brusergroups.github.io' : 'https://www.gobrain.org',
  base: isProjectPagesPreview ? '/brain-pages' : '/',
  trailingSlash: 'always',
  integrations: [sitemap()]
});
