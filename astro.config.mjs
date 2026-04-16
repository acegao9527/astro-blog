// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://example.com';

// https://astro.build/config
export default defineConfig({
	site,
	integrations: [sitemap()],
	markdown: {
		shikiConfig: {
			theme: 'github-light',
			wrap: true,
		},
	},
});
