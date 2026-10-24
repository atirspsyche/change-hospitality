import { createClient } from '@sanity/client';
import { getSanityConfig } from '../../server/sanity-config.js';

export const sanityClient = createClient(getSanityConfig(import.meta.env));