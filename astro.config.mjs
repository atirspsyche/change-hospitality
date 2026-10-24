// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { getSanityConfig } from './server/sanity-config.js';

// https://astro.build/config
export default defineConfig({
	site: 'https://www.changehospitality.co.uk',
	integrations: [react(), sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/jobs/test-') })],
	image: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io', pathname: `/images/${getSanityConfig(process.env).projectId}/${getSanityConfig(process.env).dataset}/**` }] },
	devToolbar: {
		enabled: false,
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
