# BRUG site

This repository is the static site for BRUG (Baton Rouge User Groups), the umbrella covering
BRSSUG, BRDNUG, and BRAIN's joint monthly meetings, built with Astro and deployed to GitHub Pages.

It uses Astro because the site needs two things at once:

1. A flexible public-facing layout for a community site.
2. Build-time syncing from Sessionize so speaker data stays current.

Meeting info itself (title, date, speaker, links) lives as one markdown file per
meeting in `src/content/meetings/` — see `_TEMPLATE.md` in that folder. To hand off
a new meeting without writing the file by hand, open a "New meeting" issue (uses
`.github/ISSUE_TEMPLATE/new-meeting.yml`) — a workflow turns it into a PR automatically
(see "Create a meeting from an issue" below). The description field can be left blank
if a Sessionize speaker GUID is given; it's pulled from Sessionize automatically.

## What is already set up

- Static GitHub Pages deployment.
- A build-time sync script for Sessionize speaker data.
- Build-time cross-posting of new meeting announcements to brdnug.org (WordPress) — currently dormant; see below.
- Build-time email notifications with ready-to-paste brdnug.org post text, for manual posting while the WordPress path is blocked.
- Seed content so the site still builds before API credentials are added.
- A custom domain file for `www.brusergroups.org`.

## Local development

```bash
npm install
npm run dev
```

For a fresh data pull before building:

```bash
npm run build
```

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

If any of those are missing, the site keeps using the seeded data and still builds. If the
`WORDPRESS_*` variables are unset, meeting cross-posting to brdnug.org is skipped entirely (this is
currently the case — brdnug.org's host strips the `Authorization` header before it reaches
WordPress, so REST API auth fails there; the WordPress script is left in place, disabled, for when
that's resolved). If the `GMAIL_*`/`NOTIFY_EMAIL` variables are unset, no email is sent. When
configured, the email step only fires for meeting files added or changed in that specific push
(not on the daily rebuild cron), so you get exactly one email per new/edited meeting.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds on push to `main`, on a schedule, and on manual dispatch. Add the secrets above to make the deployed site sync live data and cross-post meetings automatically.

**`www.brusergroups.org` is not live yet** — DNS hasn't been pointed at GitHub Pages, and the
custom domain isn't registered in this repo's Pages settings. Until then, preview the site at its
GitHub Pages project URL: **https://brusergroups.github.io/brusergroups-site/**. The build sets
`GITHUB_PAGES_PROJECT_PREVIEW=true` (see `astro.config.mjs` and the "Build site" step in
`deploy.yml`) so internal links resolve correctly under the `/brusergroups-site/` path. When ready
to cut over: update DNS for `www.brusergroups.org` to point at GitHub Pages, set the custom domain
in Settings → Pages, and remove `GITHUB_PAGES_PROJECT_PREVIEW` from `deploy.yml` — no other changes
needed.

## Create a meeting from an issue

`.github/workflows/create-meeting-from-issue.yml` runs whenever an issue is opened with the
`meeting` label (applied automatically by the "New meeting" issue template). It parses the
issue's fields, writes a `src/content/meetings/*.md` file, runs a full build to make sure the
new file doesn't break anything, then opens a PR (with `Closes #<issue>` in the body, so the
issue closes automatically once the PR is merged). If parsing fails (missing title/date/speaker,
or a badly formatted date) or the build fails, it comments on the issue explaining what to fix
instead of opening a broken PR. `main` is a protected branch, so this always goes through a PR —
nothing is pushed directly.
