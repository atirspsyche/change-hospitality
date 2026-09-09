import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: '3z2hqf8g',
  dataset: 'production',
  apiVersion: '2026-09-08',
  useCdn: false,
});