import { access, appendFile, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const SITE_LABEL_MAP = {
  BRUG: 'brug',
  BRSSUG: 'brssug',
  BRDNUG: 'brdnug',
  BRAIN: 'brain'
};

const UPDATE_FIELD_MAP = {
  'New session title': 'title',
  'New meeting date': 'date',
  'New speaker full name': 'speaker',
  'Sessionize speaker GUID': 'sessionizeId',
  'Speaker bio': 'bio',
  'Session abstract / description': 'body',
  'Meetup event URL': 'meetupUrl',
  'YouTube recording URL': 'youtubeUrl',
  Sponsor: 'sponsor',
  'Sponsor website URL': 'sponsorUrl',
  'Lightning talk speaker': 'lightningSpeaker',
  'Lightning talk title': 'lightningTitle',
  'Lightning talk speaker Sessionize GUID': 'lightningSessionizeId'
};

const FRONTMATTER_FIELDS = new Set([
  'title',
  'date',
  'speaker',
  'category',
  'sites',
  'sessionizeId',
  'bio',
  'meetupUrl',
  'youtubeUrl',
  'sponsor',
  'sponsorUrl',
  'lightningSpeaker',
  'lightningTitle',
  'lightningSessionizeId'
]);

function parseCheckedSites(rawContent) {
  return rawContent
    .split(/\r?\n/)
    .map((line) => /^- \[[xX]\] (.+)$/.exec(line.trim()))
    .filter(Boolean)
    .map((match) => SITE_LABEL_MAP[match[1].trim()])
    .filter(Boolean);
}

function parseIssueBody(body) {
  const fields = { currentSites: [], targetSites: [], updates: {} };
  const chunks = body.split(/\r?\n(?=### )/);

  for (const chunk of chunks) {
    const match = /^### (.+?)\r?\n+([\s\S]*)$/.exec(chunk.trim());
    if (!match) {
      continue;
    }

    const [, heading, rawContent] = match;
    const content = rawContent.trim();

    if (heading === 'Current sites') {
      fields.currentSites = parseCheckedSites(content);
    } else if (heading === 'Sites after update') {
      fields.targetSites = parseCheckedSites(content);
    } else if (heading === 'Current meeting date') {
      fields.currentDate = content;
    } else if (heading === 'Current speaker full name') {
      fields.currentSpeaker = content;
    } else if (UPDATE_FIELD_MAP[heading] && content && content !== '_No response_') {
      fields.updates[UPDATE_FIELD_MAP[heading]] = content.toLowerCase() === '[clear]' ? null : content;
    }
  }

  fields.currentSites = [...new Set(fields.currentSites)];
  fields.targetSites = [...new Set(fields.targetSites)];
  return fields;
}

function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function yamlString(value) {
  return JSON.stringify(value);
}

function applyUpdates(fileContent, updates) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(fileContent);
  if (!match) {
    throw new Error('Meeting file has no valid YAML frontmatter.');
  }

  let frontmatter = match[1];
  let body = fileContent.slice(match[0].length);

  for (const [field, value] of Object.entries(updates)) {
    if (field === 'body') {
      body = value === null ? '' : `\n${value}\n`;
      continue;
    }
    if (!FRONTMATTER_FIELDS.has(field)) {
      continue;
    }

    const linePattern = new RegExp(`^${field}:.*(?:\\r?\\n|$)`, 'm');
    if (value === null) {
      frontmatter = frontmatter.replace(linePattern, '');
    } else {
      const serializedValue = field === 'date'
        ? value
        : field === 'sites'
          ? `[${value.map(yamlString).join(', ')}]`
          : yamlString(value);
      const replacement = `${field}: ${serializedValue}`;
      frontmatter = linePattern.test(frontmatter)
        ? frontmatter.replace(linePattern, `${replacement}\n`)
        : `${frontmatter}\n${replacement}`;
    }
  }

  return `---\n${frontmatter.trimEnd()}\n---\n${body}`;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }
  const delimiter = `EOF_${Math.random().toString(36).slice(2)}`;
  await appendFile(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

function siteCategory(sites) {
  if (sites.length === Object.keys(SITE_LABEL_MAP).length) {
    return 'All Groups';
  }
  return sites.map((site) => site.toUpperCase()).join(' + ');
}

async function main() {
  const fields = parseIssueBody(process.env.ISSUE_BODY ?? '');
  const issueNumber = process.env.ISSUE_NUMBER ?? '';
  const missing = ['currentDate', 'currentSpeaker'].filter((key) => !fields[key]);
  if (fields.currentSites.length === 0) {
    missing.unshift('current sites');
  }
  if (fields.targetSites.length === 0) {
    missing.unshift('sites after update');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required field(s): ${missing.join(', ')}.`);
  }
  if (Object.keys(fields.updates).length === 0 && fields.currentSites.join() === fields.targetSites.join()) {
    throw new Error('No meeting updates were provided.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.currentDate)) {
    throw new Error(`Current meeting date "${fields.currentDate}" isn't in YYYY-MM-DD format.`);
  }
  if (fields.updates.date && fields.updates.date.toLowerCase() !== '[clear]' && !/^\d{4}-\d{2}-\d{2}$/.test(fields.updates.date)) {
    throw new Error(`New meeting date "${fields.updates.date}" isn't in YYYY-MM-DD format.`);
  }

  for (const field of ['title', 'date', 'speaker']) {
    if (field in fields.updates && fields.updates[field] === null) {
      throw new Error(`The required field "${field}" cannot be cleared.`);
    }
  }

  const oldFilename = `${fields.currentDate}-${slugify(fields.currentSpeaker)}.md`;
  const newDate = fields.updates.date ?? fields.currentDate;
  const newSpeaker = fields.updates.speaker ?? fields.currentSpeaker;
  const filename = `${newDate}-${slugify(newSpeaker)}.md`;
  const siteChanged = fields.currentSites.join() !== fields.targetSites.join();
  const updates = { ...fields.updates };

  if (siteChanged || fields.targetSites.length > 1) {
    updates.category = siteCategory(fields.targetSites);
    updates.sites = fields.targetSites.length > 1 ? fields.targetSites : null;
    if (fields.targetSites.length === 1) {
      updates.category = 'Meeting';
    }
  }

  const sourceFiles = new Map();
  for (const site of fields.currentSites) {
    const sourcePath = path.join(repoRoot, 'sites', site, 'src/content/meetings', oldFilename);
    if (!(await fileExists(sourcePath))) {
      throw new Error(`No meeting file exists at sites/${site}/src/content/meetings/${oldFilename}.`);
    }
    sourceFiles.set(site, { sourcePath, content: await readFile(sourcePath, 'utf8') });
  }

  const canonicalContent = sourceFiles.values().next().value.content;
  const targets = [];
  for (const site of fields.targetSites) {
    const meetingsDir = path.join(repoRoot, 'sites', site, 'src/content/meetings');
    const targetPath = path.join(meetingsDir, filename);
    const source = sourceFiles.get(site);
    const sourcePath = source?.sourcePath;

    if (targetPath !== sourcePath && (await fileExists(targetPath))) {
      throw new Error(`A meeting file already exists at sites/${site}/src/content/meetings/${filename}.`);
    }

    targets.push({
      site,
      targetPath,
      sourcePath,
      content: applyUpdates(source?.content ?? canonicalContent, updates)
    });
  }

  for (const target of targets) {
    await writeFile(target.targetPath, target.content, 'utf8');
  }
  for (const [site, source] of sourceFiles) {
    if (!fields.targetSites.includes(site) || source.sourcePath !== path.join(repoRoot, 'sites', site, 'src/content/meetings', filename)) {
      await unlink(source.sourcePath);
    }
  }

  const changedSites = [...new Set([...fields.currentSites, ...fields.targetSites])];
  console.log(`Updated ${filename} for ${fields.targetSites.join(', ')} from issue #${issueNumber}.`);
  await setOutput('sites', changedSites.join(' '));
  await setOutput('old_filename', oldFilename);
  await setOutput('filename', filename);
}

main().catch(async (error) => {
  console.error(error.message);
  if (process.env.GITHUB_OUTPUT) {
    await setOutput('error', error.message);
  }
  process.exitCode = 1;
});