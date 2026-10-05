import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Inside node_modules, which Dropbox ignores; Playwright recreates this folder on every run
  outputDir: 'node_modules/.cache/playwright/test-results',
  use: { baseURL: 'http://localhost:4173', acceptDownloads: true },
  projects: [{ name: 'android', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
