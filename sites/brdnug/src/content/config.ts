import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { meetingSchema } from '@brusergroups/core/schemas/meeting';

const meetings = defineCollection({
  loader: glob({ pattern: '[!_]*.md', base: './src/content/meetings' }),
  schema: meetingSchema,
});

export const collections = { meetings };
