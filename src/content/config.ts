import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const meetings = defineCollection({
  loader: glob({ pattern: '[!_]*.md', base: './src/content/meetings' }),
  schema: z.object({
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
    lightningSpeaker: z.string().optional(),
    lightningTitle: z.string().optional(),
    lightningSessionizeId: z.string().optional(),
  }),
});

export const collections = { meetings };
