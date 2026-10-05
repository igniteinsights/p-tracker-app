import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// The arc sits inside the central 62% of the canvas, within Android's
// 80% maskable safe zone, so maskable and Apple icons need no extra padding.
// Their transparent corners are filled with the icon's own background.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#1E1A1D' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#1E1A1D' } },
  },
  images: ['public/favicon.svg'],
});
