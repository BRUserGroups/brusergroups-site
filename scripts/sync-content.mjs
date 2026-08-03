import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sessionizeEventId = process.env.SESSIONIZE_EVENT_ID ?? '4m3gwjp1';
const sessionizeApiBase = process.env.SESSIONIZE_API_BASE ?? 'https://sessionize.com/api/v2';

const fallbackSite = {
  brand: 'BRUG',
  title: 'BRUG',
  description: 'Community talks and speaker updates that stay synced from Sessionize.',
  meetupUrl: 'https://www.meetup.com/',
  sessionizeUrl: 'https://sessionize.com/',
  lastSyncedAt: new Date().toISOString(),
  syncStatus: 'Seed data is active until API credentials are configured.'
};

async function readJson(relativePath, fallback) {
  try {
    const content = await readFile(path.join(rootDir, relativePath), 'utf8');
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function writeJson(relativePath, data) {
  const filePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSpeaker(item) {
  return {
    id: String(item.id ?? item.name ?? crypto.randomUUID()),
    name: item.name ?? item.fullName ?? 'Unnamed speaker',
    tagline: item.tagLine ?? item.tagline ?? '',
    bio: item.bio ?? item.shortBio ?? '',
    profilePicture: item.profilePicture ?? item.profileImage ?? '',
    sessions: []
  };
}

function normalizeSession(item) {
  const speakers = Array.isArray(item.speakers) ? item.speakers : [];
  return {
    id: String(item.id ?? item.title ?? crypto.randomUUID()),
    title: item.title ?? 'Untitled session',
    description: stripHtml(item.description ?? item.shortDescription ?? ''),
    startsAt: item.startsAt ?? item.startDateTime ?? null,
    endsAt: item.endsAt ?? item.endDateTime ?? null,
    speakers: speakers.map((speaker) => speaker.name ?? speaker.fullName ?? speaker.id ?? '').filter(Boolean)
  };
}

async function fetchSessionizeCollection(eventId, endpointNames) {
  if (!eventId) {
    return null;
  }

  for (const endpointName of endpointNames) {
    const response = await fetch(`${sessionizeApiBase}/${eventId}/view/${endpointName}`);

    if (!response.ok) {
      continue;
    }

    return response.json();
  }

  return null;
}

function extractArray(payload, keys) {
  // Sessionize Sessions endpoint returns a single group object {groupId, groupName, sessions:[...]}
  // or an array of such groups. Flatten them before processing.
  if (!Array.isArray(payload) && payload?.sessions && Array.isArray(payload.sessions)) {
    return payload.sessions;
  }
  if (Array.isArray(payload) && payload.length > 0 && 'groupName' in (payload[0] ?? {})) {
    return payload.flatMap((group) => group.sessions ?? []);
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

async function fetchSessionizeData() {
  if (!sessionizeEventId) {
    return null;
  }

  const [speakerPayload, sessionPayload] = await Promise.all([
    fetchSessionizeCollection(sessionizeEventId, ['AllSpeakers', 'Speakers']),
    fetchSessionizeCollection(sessionizeEventId, ['AllSessions', 'Sessions'])
  ]);

  const speakerItems = extractArray(speakerPayload, ['speakers', 'data', 'items']);
  const sessionItems = extractArray(sessionPayload, ['sessions', 'data', 'items']);
  const speakers = speakerItems.map(normalizeSpeaker);
  const sessions = sessionItems.map(normalizeSession);
  const speakerMap = new Map(speakers.map((speaker) => [speaker.name.toLowerCase(), speaker]));

  for (const session of sessions) {
    for (const speakerName of session.speakers) {
      const speaker = speakerMap.get(speakerName.toLowerCase());

      if (!speaker) {
        continue;
      }

      speaker.sessions.push({
        title: session.title,
        description: session.description,
        startsAt: session.startsAt,
        eventTitle: 'Sessionize event'
      });
    }
  }

  return speakers;
}

async function main() {
  const currentSite = await readJson('src/data/generated/site.json', fallbackSite);
  const currentSpeakers = await readJson('src/data/generated/speakers.json', []);

  let nextSpeakers = currentSpeakers;
  const warnings = [];

  try {
    const sessionizeSpeakers = await fetchSessionizeData();

    if (sessionizeSpeakers && sessionizeSpeakers.length > 0) {
      nextSpeakers = sessionizeSpeakers;
    }
  } catch (error) {
    warnings.push(`Sessionize sync skipped: ${error.message}`);
  }

  const nextSite = {
    ...currentSite,
    lastSyncedAt: new Date().toISOString(),
    syncStatus:
      warnings.length > 0
        ? `Sync completed with warnings: ${warnings.join(' | ')}`
        : 'Live API sync completed successfully.'
  };

  await writeJson('src/data/generated/site.json', nextSite);
  await writeJson('src/data/generated/speakers.json', nextSpeakers);

  for (const warning of warnings) {
    console.warn(warning);
  }

  console.log(`Updated ${nextSpeakers.length} speaker profile(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});