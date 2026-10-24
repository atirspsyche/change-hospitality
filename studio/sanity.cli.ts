import { defineCliConfig } from 'sanity/cli';
import { getSanityConfig } from '../server/sanity-config.js';

export default defineCliConfig({
  api: {
    ...getSanityConfig({
      SANITY_PROJECT_ID: process.env.SANITY_STUDIO_PROJECT_ID,
      SANITY_DATASET: process.env.SANITY_STUDIO_DATASET,
    }),
  },
  deployment: {
    appId: process.env.SANITY_STUDIO_APP_ID || 'zgfeuqsmyy1za5aie0ui7sm3',
    autoUpdates: false,
  },
});