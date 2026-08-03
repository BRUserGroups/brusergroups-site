import { access, appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const meetingsDir = path.join(rootDir, 'src/content/meetings');

const HEADING_MAP = {
  'Session title': 'title',
  'Meeting date': 'date',
  'Speaker full name': 'speaker',
  'Sessionize speaker GUID': 'sessionizeId',
  'Speaker bio (only if not in Sessionize)': 'bio',
  'Session abstract / description': 'body',
  'Meetup event URL': 'meetupUrl',
  'YouTube recording URL': 'youtubeUrl',
  'Sponsor (if any)': 'sponsor',
  'Sponsor website URL (if any)': 'sponsorUrl',
  'Lightning talk speaker (if any)': 'lightningSpeaker',
  'Lightning talk title (if any)': 'lightningTitle',
  'Lightning talk speaker Sessionize GUID (if any)': 'lightningSessionizeId'
};

function parseIssueBody(body) {
  const fields = {};
  const chunks = body.split(/\n(?=### )/);

  for (const chunk of chunks) {
    const match = /^### (.+?)\n+([\s\S]*)$/.exec(chunk.trim());
    if (!match) {
      continue;
    }

    const [, heading, rawContent] = match;
    const key = HEADING_MAP[heading.trim()];
    if (!key) {
      continue;
    }

    const content = rawContent.trim();
    fields[key] = content === '_No response_' ? '' : content;
  }

  return fields;
}

function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function yamlString(value) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(fields) {
  const lines = [
    `title: ${yamlString(fields.title)}`,
    `date: ${fields.date}`,
    `speaker: ${yamlString(fields.speaker)}`
  ];

  if (fields.sessionizeId) lines.push(`sessionizeId: ${yamlString(fields.sessionizeId)}`);
  if (fields.bio) lines.push(`bio: ${yamlString(fields.bio)}`);
  if (fields.meetupUrl) lines.push(`meetupUrl: ${yamlString(fields.meetupUrl)}`);
  if (fields.youtubeUrl) lines.push(`youtubeUrl: ${yamlString(fields.youtubeUrl)}`);
  if (fields.sponsor) lines.push(`sponsor: ${yamlString(fields.sponsor)}`);
  if (fields.sponsorUrl) lines.push(`sponsorUrl: ${yamlString(fields.sponsorUrl)}`);
  if (fields.lightningSpeaker) lines.push(`lightningSpeaker: ${yamlString(fields.lightningSpeaker)}`);
  if (fields.lightningTitle) lines.push(`lightningTitle: ${yamlString(fields.lightningTitle)}`);
  if (fields.lightningSessionizeId) lines.push(`lightningSessionizeId: ${yamlString(fields.lightningSessionizeId)}`);

  return `---\n${lines.join('\n')}\n---\n`;
}

async function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }
  const delimiter = `EOF_${Math.random().toString(36).slice(2)}`;
  await appendFile(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const issueBody = process.env.ISSUE_BODY ?? '';
  const issueNumber = process.env.ISSUE_NUMBER ?? '';

  const fields = parseIssueBody(issueBody);
  const missing = ['title', 'date', 'speaker'].filter((key) => !fields[key]);

  if (missing.length > 0) {
    await setOutput('error', `Missing required field(s): ${missing.join(', ')}.`);
    console.error(`Missing required field(s): ${missing.join(', ')}.`);
    process.exitCode = 1;
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) {
    await setOutput('error', `Meeting date "${fields.date}" isn't in YYYY-MM-DD format.`);
    console.error(`Meeting date "${fields.date}" isn't in YYYY-MM-DD format.`);
    process.exitCode = 1;
    return;
  }

  const filename = `${fields.date}-${slugify(fields.speaker)}.md`;
  const filePath = path.join(meetingsDir, filename);

  if (await fileExists(filePath)) {
    await setOutput('error', `A meeting file already exists at src/content/meetings/${filename}.`);
    console.error(`A meeting file already exists at src/content/meetings/${filename}.`);
    process.exitCode = 1;
    return;
  }

  const frontmatter = buildFrontmatter(fields);
  const body = fields.body ? `\n${fields.body.trim()}\n` : '\n';

  await mkdir(meetingsDir, { recursive: true });
  await writeFile(filePath, `${frontmatter}${body}`, 'utf8');

  const warnings = [];
  if (!fields.body && !fields.sessionizeId) {
    warnings.push(
      'No abstract was given and no Sessionize speaker GUID was set, so the meeting page will show a "Description coming soon" placeholder until one of those is added.'
    );
  }
  if (Boolean(fields.lightningSpeaker) !== Boolean(fields.lightningTitle)) {
    warnings.push(
      'Only one of lightning talk speaker/title was given — both are required for the lightning talk to show on the site.'
    );
  }

  console.log(`Created src/content/meetings/${filename} from issue #${issueNumber}.`);
  await setOutput('filename', filename);
  await setOutput('warnings', warnings.join(' '));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
