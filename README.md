# p-tracker

A private, ad-free period tracker that installs to your phone's home screen and works offline. Built to replace MyDays.

All data stays on the device (IndexedDB). Nothing is sent anywhere. Export a JSON backup from Settings now and then.

## Install

Open **https://igniteinsights.github.io/p-tracker-app/** on your phone.

- **Android (Chrome):** tap *Install* when prompted, or menu ⋮ → *Install app*.
- **iPhone (Safari):** Share → *Add to Home Screen*.

First run: Settings → *Import from MyDays* → choose your `.myd` file → *Merge*.

## Develop

    npm install
    npm run dev        # http://localhost:5173
    npm test           # unit tests
    npm run e2e        # Playwright at Pixel 7 size

The local-only test `tests/local/real-history.test.ts` checks a real MyDays export if one named `Default_User_*.myd` sits in the repo root. It hard-codes nothing from that file. Such files are git-ignored and never committed.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: install, unit tests, build with `BASE_PATH=/<repo>/`, then publish `dist` to GitHub Pages.

To host elsewhere at the domain root (e.g. Cloudflare Pages), build with `npm run build` and serve `dist`; no `BASE_PATH` is needed.

## Data formats

- Backup: JSON, `schemaVersion: 1`, see `docs/superpowers/specs/2026-10-05-p-tracker-design.md` §5.2.
- Spreadsheet export: CSV `date,type,note`.
