import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { parseMeetingFile } from './lib/parse-meeting.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const meetingsDir = path.join(rootDir, 'src/content/meetings');
const meetingsRelativeDir = 'src/content/meetings';

const eventName = process.env.GITHUB_EVENT_NAME;
const eventBefore = process.env.GITHUB_EVENT_BEFORE;
const eventAfter = process.env.GITHUB_EVENT_AFTER;

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
const notifyEmail = process.env.NOTIFY_EMAIL;

function getChangedMeetingFiles() {
  const output = execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=AM', eventBefore, eventAfter, '--', meetingsRelativeDir],
    { cwd: rootDir, encoding: 'utf8' }
  );

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.md') && !line.endsWith('_TEMPLATE.md'))
    .map((line) => path.basename(line));
}

function formatMeetingDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function buildEmail(meeting) {
  const formattedDate = formatMeetingDate(meeting.date);
  const subject = `BRDNUG cross-post ready: ${meeting.title} (${formattedDate})`;

  const lines = [
    `BRDNUG MEETING: ${formattedDate}`,
    '',
    'When: Second Wednesday · 5:15 PM Food & Networking · 6:00 PM Presentation',
    '',
    `Main Presentation: ${meeting.title}`,
    `Presenter: ${meeting.speaker}`,
    '',
    meeting.body
  ];

  if (meeting.lightningSpeaker && meeting.lightningTitle) {
    lines.push('', `Lightning talk: ${meeting.lightningTitle} — ${meeting.lightningSpeaker}`);
  }

  if (meeting.sponsor) {
    lines.push('', `Sponsor: ${meeting.sponsor}`);
  }

  if (meeting.meetupUrl) {
    lines.push(`RSVP: ${meeting.meetupUrl}`);
  }

  if (meeting.youtubeUrl) {
    lines.push(`YouTube: ${meeting.youtubeUrl}`);
  }

  lines.push(
    '',
    '---',
    'Paste this into WP Admin > Posts > Add New on brdnug.org. Suggested category: Meeting.'
  );

  return { subject, text: lines.join('\n') };
}

async function main() {
  if (eventName !== 'push') {
    console.log(`Email cross-post skipped: not a push event (event was "${eventName}").`);
    return;
  }

  if (!gmailUser || !gmailAppPassword || !notifyEmail) {
    console.log('Email cross-post skipped: GMAIL_USER, GMAIL_APP_PASSWORD, or NOTIFY_EMAIL not configured.');
    return;
  }

  const changedFiles = getChangedMeetingFiles();

  if (changedFiles.length === 0) {
    console.log('Email cross-post: no meeting files changed in this push.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword }
  });

  let sent = 0;
  const warnings = [];

  for (const file of changedFiles) {
    try {
      const raw = await readFile(path.join(meetingsDir, file), 'utf8');
      const meeting = parseMeetingFile(raw);

      if (!meeting?.title || !meeting?.date || !meeting?.speaker) {
        continue;
      }

      const { subject, text } = buildEmail(meeting);

      await transporter.sendMail({
        from: gmailUser,
        to: notifyEmail,
        subject,
        text
      });

      sent += 1;
    } catch (error) {
      warnings.push(`${file}: ${error.message}`);
    }
  }

  console.log(`Email cross-post: sent ${sent} email(s).`);

  for (const warning of warnings) {
    console.warn(warning);
  }
}

main().catch((error) => {
  console.error(error);
});
