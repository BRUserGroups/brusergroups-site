import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { siteData } from '../lib/data';
import { stripMarkdown } from '@brusergroups/core/lib/format';

export async function GET(context: APIContext) {
  const meetings = await getCollection('meetings');
  const sorted = meetings.slice().sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  return rss({
    title: siteData.title,
    description: siteData.description,
    site: context.site!,
    items: sorted.map((meeting) => ({
      title: meeting.data.title,
      pubDate: meeting.data.date,
      description: stripMarkdown(meeting.body ?? '', 400) || `${meeting.data.speaker} — details coming soon.`,
      link: `${base}/meetings/${meeting.id}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
