// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { getProjectConfig } from './scripts/config.mjs';

const { siteUrl } = getProjectConfig();

// https://astro.build/config
export default defineConfig({
	site: siteUrl,
	integrations: [sitemap()],
	markdown: {
		shikiConfig: {
			theme: 'github-dark',
			wrap: true,
		},
	},
});
