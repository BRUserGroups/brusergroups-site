import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// New site — not yet cut over to its custom domain (www.brdnug.org). deploy.yml sets
// GITHUB_PAGES_PROJECT_PREVIEW so the site works at its GitHub Pages project URL,
// https://brusergroups.github.io/brdnug-pages/, which needs a /brdnug-pages base path.
// Once DNS is cut over and the custom domain is set on BRUserGroups/brdnug-pages,
// remove that env var from deploy.yml — no changes needed here.
const isProjectPagesPreview = process.env.GITHUB_PAGES_PROJECT_PREVIEW === 'true';

export default defineConfig({
  site: isProjectPagesPreview ? 'https://brusergroups.github.io' : 'https://www.brdnug.org',
  base: isProjectPagesPreview ? '/brdnug-pages' : '/',
  trailingSlash: 'always',
  integrations: [sitemap()]
});
