# Baton Rouge User Groups — sites monorepo

This repository is the source for **four** static community sites, sharing one Astro layout,
component library, and set of build scripts, each with its own branding, color palette, and
page copy:

| Site | Brand | Domain | Directory |
|---|---|---|---|
| BRUG | Baton Rouge User Groups (umbrella) | www.brusergroups.org | `sites/brug` |
| BRSSUG | Baton Rouge SQL Server User Group | www.brssug.org | `sites/brssug` |
| BRDNUG | Baton Rouge .NET User Group | www.brdnug.org | `sites/brdnug` |
| BRAIN | Baton Rouge Analytics & Intelligence Network | www.gobrain.org | `sites/brain` |

It uses Astro because each site needs two things at once:

1. A flexible public-facing layout for a community site.
2. Build-time syncing from Sessionize so speaker data stays current.

## Layout

```
packages/core/     # shared layout, components, meeting content schema, and build scripts
sites/brug/         # BRUG's pages, palette, branding, and meeting content
sites/brssug/        # BRSSUG's — same shape
sites/brdnug/         # BRDNUG's — same shape
sites/brain/           # BRAIN's — same shape
```

Each `sites/<site>/` is its own Astro project with its own `src/pages/*.astro` (so page copy is
genuinely site-specific — not templated substitution), its own `src/styles/global.css` (palette
lives entirely in the `:root` custom properties at the top), its own logo/icon files under
`public/`, and its own `src/data/generated/site.json` (brand name, tagline, contact info, social
links). All of that is what you'd edit to adjust one site's look or copy without touching the
others. Sites without a logo file yet (BRDNUG, BRAIN) fall back to a text wordmark — drop the
real logo PNGs into `sites/<site>/public/` and pass `logoSrc`/`logoWhiteSrc`/`iconSrc` in that
site's `src/layouts/SiteLayout.astro` once you have them.

Meeting info itself (title, date, speaker, links) lives as one markdown file per meeting in each
site's `src/content/meetings/` — see `_TEMPLATE.md` in that folder. To hand off a new meeting
without writing the file by hand, open a "New meeting" issue (uses
`.github/ISSUE_TEMPLATE/new-meeting.yml`) — a workflow turns it into a PR automatically (see
"Create a meeting from an issue" below). Groups usually meet jointly with a shared presenter, so
the issue form lets you check off every site the meeting applies to; the same file gets written
into each checked site's content folder in one PR. Check only one site when a group meets on its
own.

## Local development

```bash
npm install
npm run dev -w sites/brug        # or sites/brssug, sites/brdnug, sites/brain
```

For a fresh data pull before building:

```bash
npm run build -w sites/brug
```

## Adding a new site

1. Copy an existing `sites/<site>/` directory as a starting point.
2. Update its `package.json` name, `astro.config.mjs` domain, `public/CNAME`, and
   `src/data/generated/site.json`.
3. Pick a palette by editing the `:root` block at the top of `src/styles/global.css` — every
   other color in that file derives from those variables plus a couple of literal accent tints,
   so a new palette is a small, contained edit.
4. Rewrite the page copy in `src/pages/*.astro` for the new brand.
5. Add the site to the `matrix` in `.github/workflows/deploy.yml` and to the sites list in
   `.github/ISSUE_TEMPLATE/new-meeting.yml`.
6. Create a `BRUserGroups/<site>-pages` repo (empty, GitHub Pages enabled) as its deploy target.

## API configuration

Set these environment variables locally or in GitHub Actions secrets:

- `SESSIONIZE_EVENT_ID`: the public Sessionize event ID or slug.
- `SESSIONIZE_API_BASE`: optional override for the Sessionize API base URL.
- `WORDPRESS_API_BASE`: the brdnug.org WordPress REST API base, e.g. `https://brdnug.org/wp-json/wp/v2`.
- `WORDPRESS_USERNAME`: the WordPress user for cross-posting meetings.
- `WORDPRESS_APP_PASSWORD`: a WordPress Application Password for that user (not their login password).
- `WORDPRESS_CATEGORY_ID`: optional numeric WordPress category ID to file cross-posted meetings under.
- `GMAIL_USER`: the Gmail address to send brdnug.org post drafts from.
- `GMAIL_APP_PASSWORD`: a Gmail App Password for that account (not the account login password; requires 2FA enabled).
- `NOTIFY_EMAIL`: the address that receives the ready-to-paste post text.
- `PAGES_DEPLOY_TOKEN`: a GitHub personal access token (or fine-grained token) with `contents: write`
  on `BRUserGroups/brssug-pages`, `BRUserGroups/brdnug-pages`, and `BRUserGroups/brain-pages` — used
  to push each site's built output to its deploy repo.

If `SESSIONIZE_*` is missing, a site keeps using its seeded data and still builds. The
`WORDPRESS_*`/`GMAIL_*`/`NOTIFY_EMAIL` variables only apply to BRUG's build leg — they cross-post
new meeting announcements to brdnug.org's old WordPress site until BRDNUG's own new site
(`sites/brdnug`) is live at its custom domain, at which point that cross-post step is dead weight
and should be removed. Currently `WORDPRESS_*` is unset (brdnug.org's host strips the
`Authorization` header before it reaches WordPress, so REST API auth fails there), so cross-posting
is skipped and the email draft step is the working fallback.

## GitHub Pages

`.github/workflows/deploy.yml` builds all four sites on push to `main`, on a schedule, and on
manual dispatch:

- **BRUG** deploys the way this repo always has — `actions/deploy-pages` straight to this repo's
  own GitHub Pages environment. It's live at **https://www.brusergroups.org**, via a `www` CNAME
  DNS record pointing at `brusergroups.github.io` and the custom domain set in this repo's Pages
  settings.
- **BRSSUG, BRDNUG, and BRAIN** each build in their own matrix job and push their `dist/` to a
  dedicated thin "deploy" repo (`BRUserGroups/brssug-pages`, `BRUserGroups/brdnug-pages`,
  `BRUserGroups/brain-pages`) via `peaceiris/actions-gh-pages`, using the `PAGES_DEPLOY_TOKEN`
  secret above. Those repos exist only to host built HTML — enable GitHub Pages on each and set
  its custom domain once DNS is ready, and remove the `GITHUB_PAGES_PROJECT_PREVIEW` env var for
  that site's matrix leg in `deploy.yml` once its custom domain is live (mirrors how BRUG's own
  cutover worked — see the comment in each site's `astro.config.mjs`).

## Create a meeting from an issue

`.github/workflows/create-meeting-from-issue.yml` runs whenever an issue is opened with the
`meeting` label (applied automatically by the "New meeting" issue template). It parses the
issue's fields, writes a `sites/<site>/src/content/meetings/*.md` file for every site checked in
the issue, builds each affected site to make sure the new file doesn't break anything, then opens
one PR covering all of them (with `Closes #<issue>` in the body, so the issue closes automatically
once the PR is merged). If parsing fails (no site checked, missing title/date/speaker, or a badly
formatted date) or a build fails, it comments on the issue explaining what to fix instead of
opening a broken PR. `main` is a protected branch, so this always goes through a PR — nothing is
pushed directly.
