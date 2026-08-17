import siteDataJson from '../data/generated/site.json';
import speakersJson from '../data/generated/speakers.json';
import type { SiteData, Speaker } from '@brusergroups/core/lib/types';

export const siteData = siteDataJson as SiteData;
export const speakers = speakersJson as Speaker[];
