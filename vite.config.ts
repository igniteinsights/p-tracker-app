/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// GitHub Pages serves the app from /<repo>/; local dev and preview use /.
const base = process.env.BASE_PATH ?? '/';

// Release number: major.minor from package.json, then the commit count, so every deploy gets a new one
function appVersion(): string {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  try {
    const count = execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return `${version.split('.').slice(0, 2).join('.')}.${count}`;
  } catch {
    return version;
  }
}
const version = appVersion();

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      // Not precached, so an older copy of the app can fetch it to name the new version
      name: 'version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
      },
    },
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'p-tracker',
        short_name: 'p-tracker',
        description: 'A private, ad-free period tracker.',
        theme_color: '#FBFAFB',
        background_color: '#FBFAFB',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
