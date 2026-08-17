import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseMeetingFile } from './lib/parse-meeting.mjs';

// Resolves relative to the invoking site's package directory (npm sets CWD to the
// workspace running the script), not to this shared script's own location.
const rootDir = process.cwd();
const meetingsDir = path.join(rootDir, 'src/content/meetings');

const wpApiBase = process.env.WORDPRESS_API_BASE;
const wpUsername = process.env.WORDPRESS_USERNAME;
const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD;
const wpCategoryId = process.env.WORDPRESS_CATEGORY_ID;

const BACKFILL_CUTOFF_DAYS = 7;

function authHeader() {
  const token = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');
  return `Basic ${token}`;
}

function markdownBodyToHtml(body) {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => `<p>${paragraph.trim()}</p>`)
    .filter((paragraph) => paragraph !== '<p></p>')
    .join('\n');
}

async function findExistingPost(slug) {
  const url = `${wpApiBase}/posts?slug=${encodeURIComponent(slug)}&status=any,trash`;
  const response = await fetch(url, { headers: { Authorization: authHeader() } });

  if (!response.ok) {
    throw new Error(`WordPress lookup failed (${response.status}) for slug ${slug}`);
  }

  const posts = await response.json();
  return posts[0] ?? null;
}

function buildPayload(meeting, slug) {
  const payload = {
    title: meeting.title,
    slug,
    content: markdownBodyToHtml(meeting.body),
    status: 'publish',
    date: meeting.date
  };

  if (wpCategoryId) {
    payload.categories = [Number(wpCategoryId)];
  }

  return payload;
}

async function createPost(meeting, slug) {
  const response = await fetch(`${wpApiBase}/posts`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(meeting, slug))
  });

  if (!response.ok) {
    throw new Error(`WordPress create failed (${response.status}) for slug ${slug}: ${await response.text()}`);
  }

  return response.json();
}

async function updatePost(existingId, meeting, slug) {
  const response = await fetch(`${wpApiBase}/posts/${existingId}`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(meeting, slug))
  });

  if (!response.ok) {
    throw new Error(`WordPress update failed (${response.status}) for slug ${slug}: ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  if (!wpApiBase || !wpUsername || !wpAppPassword) {
    console.log('WordPress cross-post skipped: WORDPRESS_* environment variables are not configured.');
    return;
  }

  const files = (await readdir(meetingsDir)).filter(
    (file) => file.endsWith('.md') && file !== '_TEMPLATE.md'
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - BACKFILL_CUTOFF_DAYS);

  let created = 0;
  let updated = 0;
  const warnings = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');

    try {
      const raw = await readFile(path.join(meetingsDir, file), 'utf8');
      const meeting = parseMeetingFile(raw);

      if (!meeting?.title || !meeting?.date) {
        continue;
      }

      if (new Date(meeting.date) < cutoff) {
        continue;
      }

      const existing = await findExistingPost(slug);

      if (existing) {
        await updatePost(existing.id, meeting, slug);
        updated += 1;
      } else {
        await createPost(meeting, slug);
        created += 1;
      }
    } catch (error) {
      warnings.push(`${file}: ${error.message}`);
    }
  }

  console.log(`WordPress cross-post: created ${created} post(s), updated ${updated} post(s).`);

  for (const warning of warnings) {
    console.warn(warning);
  }
}

main().catch((error) => {
  console.error(error);
});
