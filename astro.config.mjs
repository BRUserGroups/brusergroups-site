import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Temporary: the custom domain (www.brssug.org) is still on the old Google Sites
// host and hasn't been cut over to GitHub Pages yet (pending group signoff). Until
// then, the deploy workflow sets GITHUB_PAGES_PROJECT_PREVIEW so the site works
// correctly at its GitHub Pages project URL, https://kennyneal.github.io/brssug-site/,
// which needs a /brssug-site base path. Once DNS is cut over and the custom domain
// is set in repo Settings > Pages, remove that env var from deploy.yml — no changes
// needed here, it'll fall back to the real domain automatically.
const isProjectPagesPreview = process.env.GITHUB_PAGES_PROJECT_PREVIEW === 'true';

export default defineConfig({
  site: isProjectPagesPreview ? 'https://kennyneal.github.io' : 'https://www.brssug.org',
  base: isProjectPagesPreview ? '/brssug-site' : '/',
  trailingSlash: 'always',
  integrations: [sitemap()]
});