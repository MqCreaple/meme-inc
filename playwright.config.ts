import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:4322', headless: true },
  webServer: {
    // Keep the preview in Playwright's process even in an agent environment.
    env: { ASTRO_PREVIEW_BACKGROUND: '1' },
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4322',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: !process.env.CI,
  },
});
