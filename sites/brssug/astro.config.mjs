import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// www.brssug.org is live and cut over to GitHub Pages. GITHUB_PAGES_PROJECT_PREVIEW is
// no longer set for this site's matrix leg in deploy.yml, so this always builds for the
// real domain — this flag just stays available as a manual escape hatch back to the
// GitHub Pages project URL (https://brusergroups.github.io/brssug-pages/) if the custom
// domain ever needs to be temporarily unset.
const isProjectPagesPreview = process.env.GITHUB_PAGES_PROJECT_PREVIEW === 'true';

export default defineConfig({
  site: isProjectPagesPreview ? 'https://brusergroups.github.io' : 'https://www.brssug.org',
  base: isProjectPagesPreview ? '/brssug-pages' : '/',
  trailingSlash: 'always',
  integrations: [sitemap()]
});
