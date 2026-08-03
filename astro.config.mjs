import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// www.brusergroups.org is live and cut over to GitHub Pages. GITHUB_PAGES_PROJECT_PREVIEW
// is no longer set in deploy.yml, so this always builds for the real domain — this flag
// just stays available as a manual escape hatch back to the GitHub Pages project URL
// (https://brusergroups.github.io/brusergroups-site/) if the custom domain ever needs
// to be temporarily unset.
const isProjectPagesPreview = process.env.GITHUB_PAGES_PROJECT_PREVIEW === 'true';

export default defineConfig({
  site: isProjectPagesPreview ? 'https://brusergroups.github.io' : 'https://www.brusergroups.org',
  base: isProjectPagesPreview ? '/brusergroups-site' : '/',
  trailingSlash: 'always',
  integrations: [sitemap()]
});