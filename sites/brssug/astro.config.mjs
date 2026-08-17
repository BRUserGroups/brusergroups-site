import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Temporary: www.brssug.org hasn't been cut over to GitHub Pages yet (pending DNS +
// custom domain being set on BRUserGroups/brssug-pages). Until then, deploy.yml sets
// GITHUB_PAGES_PROJECT_PREVIEW so the site works correctly at its GitHub Pages project
// URL, https://brusergroups.github.io/brssug-pages/, which needs a /brssug-pages base
// path. Once DNS is cut over and the custom domain is set on that repo, remove that
// env var from deploy.yml — no changes needed here, it'll fall back to the real domain
// automatically.
const isProjectPagesPreview = process.env.GITHUB_PAGES_PROJECT_PREVIEW === 'true';

export default defineConfig({
  site: isProjectPagesPreview ? 'https://brusergroups.github.io' : 'https://www.brssug.org',
  base: isProjectPagesPreview ? '/brssug-pages' : '/',
  trailingSlash: 'always',
  integrations: [sitemap()]
});
