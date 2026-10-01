import { defineConfig } from 'astro/config';

const owner = process.env.GITHUB_REPOSITORY_OWNER || 'example';

export default defineConfig({
  site: process.env.SITE_URL || `https://${owner}.github.io`,
  base: process.env.BASE_PATH || '/AEEL-JWS',
  trailingSlash: 'always',
});
