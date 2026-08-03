import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Temporary: the custom domain (www.brusergroups.org) hasn't been cut over to
// GitHub Pages yet (pending DNS). Until then, the deploy workflow sets
// GITHUB_PAGES_PROJECT_PREVIEW so the site works correctly at its GitHub Pages
// project URL, https://brusergroups.github.io/brusergroups-site/, which needs a
// /brusergroups-site base path. Once DNS is cut over and the custom domain is set
// in repo Settings > Pages, remove that env var from deploy.yml — no changes
// needed here, it'll fall back to the real domain automatically.
const isProjectPagesPreview = process.env.GITHUB_PAGES_PROJECT_PREVIEW === 'true';

export default defineConfig({
  site: isProjectPagesPreview ? 'https://brusergroups.github.io' : 'https://www.brusergroups.org',
  base: isProjectPagesPreview ? '/brusergroups-site' : '/',
  trailingSlash: 'always',
  integrations: [sitemap()]
});