import { z } from 'astro:content';

export const meetingSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  speaker: z.string(),
  bio: z.string().optional(),
  sessionizeId: z.string().optional(),
  meetupUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  sponsor: z.string().optional(),
  sponsorUrl: z.string().optional(),
  category: z.string().default('Meeting'),
  // Site keys (e.g. ["brssug", "brdnug"]) this meeting is shared across, when it's a joint
  // meeting. Drives the colored per-group badge in JointMeetingKicker; absent/single-entry
  // means a regular single-group meeting.
  sites: z.array(z.string()).optional(),
  lightningSpeaker: z.string().optional(),
  lightningTitle: z.string().optional(),
  lightningSessionizeId: z.string().optional(),
});
