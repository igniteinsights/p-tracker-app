# p-tracker — Design Spec

**Date:** 2026-10-05
**Status:** Draft for review
**Visual reference:** [`assets/2026-10-05-combined-mockup.html`](assets/2026-10-05-combined-mockup.html) (open in Chrome)

## 1. Purpose

Replace the MyDays period tracker, which has become unusable because of ad interruptions, with an ad-free, private, installable web app. The app must import the existing MyDays history without loss and support import/export from then on.

**Success criteria**

1. The MyDays `.myd` file imports with every entry preserved, including notes that span several lines.
2. Logging a day takes one tap from the home screen and works offline.
3. The app installs on Android (primary) and iPhone (supported) and runs full-screen from the home screen.
4. Data can be exported to JSON and CSV, and a JSON export imports back with no loss.
5. No ads, accounts, analytics or network calls carrying user data.

## 2. Users and constraints

- **One person, one phone.** No accounts, no sync in phase 1.
- **All data stays on the device**, in IndexedDB. A JSON export is the backup.
- **Primarily Android (Chrome)**, and also compatible with iOS Safari as an installed web app.
- The personal history file (`*.myd`) and exports (`*-export*.json/csv`, `exports/`) must never be committed. These patterns are already in `.gitignore`.

## 3. Scope

### Phase 1 (this spec)

- Today, Calendar and Settings screens, plus the Log-a-day sheet
- Logging: period start, period end, intimacy, note
- Cycle predictions (next period, ovulation estimate, fertile window, late detection)
- Import: MyDays `.myd`, app JSON backup
- Export: JSON backup, CSV for spreadsheets
- Backup reminder
- PWA: installable, offline, update prompt, iOS support
- Deploy to Cloudflare Pages from the private GitHub repo

### Phase 2 (separate spec, not built now)

- Optional Google Sheets sync: Google Identity Services sign-in, the narrow `drive.file` access level (avoids Google's app review), one spreadsheet created by the app. Phase 1's data layer must allow this to be added without touching the screens (see §6.3).

### Non-goals

- Symptoms, mood, temperature or other tracking types (not used in the MyDays history)
- Push notifications or reminders
- Multiple users or profiles
- Exporting to `.myd`
- Dark mode (can be added later; tokens make it straightforward)

## 4. Visual design

Direction: **Ribbon home with the Page calendar**. It takes its restraint, whitespace and typographic hierarchy from Notion and has its own identity in the cycle ribbon and a deep berry accent. The approved mockup is in the visual reference above.

### 4.1 Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FBFAFB` | App background |
| `--surface` | `#FFFFFF` | Lists, inputs |
| `--ink` | `#1E1A1D` | Primary text, today marker, primary buttons |
| `--muted` | `#7A7078` | Secondary text, inactive nav |
| `--line` | `#E6DFE5` | Dividers, borders |
| `--tile` | `#ECE6EB` | Future ribbon tiles |
| `--tile-past` | `#D9CFD7` | Past ribbon tiles |
| `--berry` | `#7B2D5E` | Period, primary chip, toggles on |
| `--berry-soft` | `#F1E3EC` | Logged period days, backup nudge |
| `--lilac` | `#C7A6BD` | Fertile hatch, ovulation, predicted-day outline |

**Type:** Bricolage Grotesque (Google Fonts, self-hosted for offline use), weights 400/500/600/800. Scale: cycle-day number 84px/800 with tight tracking; screen titles 22–26px/600; body 15–16px; meta 12–13px. Sentence case throughout; no all-caps labels.

**Shape:** 14px radius for grouped lists and fact grid; 12px for inputs and buttons; 999px for chips; 7px for calendar day cells; 3–4px for ribbon tiles.

**Motion:** only in response to user actions (sheet slides up, toggle). Respects `prefers-reduced-motion`.

### 4.2 Screens

Bottom navigation: **Today · Calendar · Settings**.

**Today**
- Date line ("Monday 5 October").
- Cycle day number, large, with "of N", where N is the predicted cycle length.
- One-line status: "Period expected in 12 days, around Sat 17 Oct." If late: "Period 3 days late." With no data: an invitation to log a period start or import from MyDays.
- **Ribbon:** one tile per day of the current cycle, length = max(predicted length, current day).
  - Period days are filled berry.
  - Fertile days are hatched lilac, and the ovulation estimate is solid lilac.
  - Past days use `--tile-past` and future days `--tile`.
  - Today is ink-coloured and taller than the others.
  - Labels underneath: the cycle start date, the ovulation estimate and the predicted end date.
  - Tapping the ribbon opens the Calendar.
- **Fact grid** (2×2): last period (date and length), average cycle, fertile window status, cycles logged (the number of period starts).
- **Quick-log chips:** "Period started" (primary), "Intimacy", "Note". Each acts on today. "Note" opens the Log sheet with focus in the note field. "Period started" and "Intimacy" save immediately (after the too-soon check in §10) and show an undo toast ("Period start logged. Undo"). A chip whose entry already exists for today is shown as active, and tapping it removes the entry, with the same undo toast.

**Calendar**
- Months stacked vertically in a continuous scroll, newest at the bottom; opens scrolled to the current month. Months are rendered lazily as they scroll into view, because the history covers about 190 months. Each month has a title and a Monday-first 7-column grid.
- Day states:
  - Logged period (filled `--berry-soft`, berry text)
  - Predicted period (lilac outline)
  - Fertile (lilac hatch)
  - Today (ink fill, white text)
- Markers: intimacy as a berry dot (bottom centre), note as a small square in `--muted` (top right).
- A legend sits beneath the grids.
- Tapping a day opens the Log sheet for that date.
- Future days beyond today can be opened, but only a note can be saved for them; the period and intimacy toggles are disabled.

**Log a day (bottom sheet)**
- Title is the full date, with previous/next-day arrows.
- Rows:
  - Period started (toggle)
  - Period ended (toggle, with the hint "Optional, otherwise estimated")
  - Intimacy (toggle)
  - Note (multi-line text field)
- "Save" writes all changes for that date in one transaction. Dismissing with unsaved changes asks "Discard changes?".

**Settings**
- **Backup nudge** (shown when the last JSON export is more than 30 days old, or when there has never been one and data exists): "Last backup was 34 days ago. Your data is only on this phone, so export a copy now and then."
- **Your data:**
  - Export backup (JSON)
  - Export for spreadsheets (CSV)
  - Import backup (JSON)
  - Import from MyDays (.myd)
- **Predictions:**
  - Cycle length (Auto / fixed 18–45)
  - Period length (Auto / fixed 2–10)
- **About:** version number, and the disclaimer: "Predictions are estimates based on your past cycles. They are not a reliable form of contraception."
- **Delete all data:** requires typing "delete" to confirm, and offers an export first.

## 5. Data model

### 5.1 Stored records (IndexedDB via Dexie)

```ts
type EntryType = 'period-start' | 'period-end' | 'intimacy' | 'note';

interface Entry {
  id: string;          // crypto.randomUUID()
  date: string;        // 'YYYY-MM-DD', a calendar day with no time zone
  type: EntryType;
  text?: string;       // only for 'note'; required and non-empty for notes
}

interface Settings {
  cycleLength:  { mode: 'auto' | 'fixed'; value: number };  // default auto, 28
  periodLength: { mode: 'auto' | 'fixed'; value: number };  // default auto, 5
}

interface Meta {
  lastBackupAt: string | null;   // ISO timestamp of last successful JSON export
  storagePersisted: boolean;
  iosHintDismissed: boolean;
}
```

**Invariant:** at most one entry per `(date, type)`. This is enforced by a compound unique index `[date+type]`. Multiple notes on one day are merged into a single note (texts joined with a newline) during import.

Derived data (cycles, averages, predictions) is **never stored**. It is recalculated from entries and settings each time.

### 5.2 JSON export format (schema v1)

```json
{
  "app": "p-tracker",
  "schemaVersion": 1,
  "exportedAt": "2026-10-05T09:40:00+13:00",
  "settings": {
    "cycleLength":  { "mode": "auto", "value": 28 },
    "periodLength": { "mode": "auto", "value": 5 }
  },
  "entries": [
    { "date": "2024-03-21", "type": "period-start" },
    { "date": "2023-12-14", "type": "intimacy" },
    { "date": "2023-05-17", "type": "note", "text": "light day" }
  ]
}
```

- Entries are sorted by date ascending, then by type in the order above. `id` is omitted (it is regenerated on import).
- Filename: `p-tracker-export-YYYY-MM-DD.json`.

### 5.3 CSV export

- Header `date,type,note`; one row per entry, sorted as in §5.2; `note` is empty except for notes.
- RFC 4180 quoting: fields containing `,`, `"` or newlines are wrapped in quotes, with `"` doubled. UTF-8 with a byte-order mark so Excel detects the encoding.
- Filename: `p-tracker-export-YYYY-MM-DD.csv`.
- CSV is export-only. It cannot be imported.

## 6. Architecture

### 6.1 Stack

React 18 + TypeScript + Vite, `vite-plugin-pwa` (Workbox), Dexie, Vitest, Playwright. Styling is plain CSS with custom-property tokens (§4.1) and one CSS file per component. No UI framework.

### 6.2 Module layout

```
src/
  domain/          # pure functions, no browser APIs
    dates.ts       # YYYY-MM-DD arithmetic (UTC-noon based, no local-TZ drift)
    cycles.ts      # entries → cycles
    predict.ts     # cycles + settings → prediction
  io/              # pure parse/serialise
    myd.ts         # .myd text → { entries, settings, warnings }
    backup.ts      # JSON v1 serialise / parse + validate
    csv.ts         # entries → CSV string
  data/
    db.ts          # Dexie schema
    repo.ts        # the only module touching storage: getEntries, saveDay,
                   # importEntries(mode), getSettings, setSettings, meta
    useData.ts     # React hook: live query over repo + derived prediction
  ui/
    tokens.css
    App.tsx, Nav.tsx
    today/  (TodayScreen, Ribbon, FactGrid, QuickLog)
    calendar/ (CalendarScreen, Month, DayCell, Legend)
    log/   (LogSheet)
    settings/ (SettingsScreen, ImportFlow, ExportActions, BackupNudge)
    common/ (Sheet, Toggle, Toast, ConfirmDialog)
  pwa/             # update prompt, iOS install hint, storage.persist()
```

`domain/` and `io/` are pure and fully unit-tested. Screens read through `useData` and write through `repo`. Nothing else touches Dexie.

### 6.3 Phase 2 readiness

`repo.ts` exposes an interface (`Repo`) and records every write in a `changes` log (entry id, operation, timestamp). Phase 1 does not read that log. A phase 2 sync adapter can consume it and call the same `Repo` methods to apply remote changes, without any screen changes.

### 6.4 Dates

All dates are `YYYY-MM-DD` strings. "Today" is the device's local calendar date. Arithmetic converts dates to UTC midnight internally so daylight-saving changes cannot shift a day. Times of day are never stored.

## 7. Predictions (`domain/cycles.ts`, `domain/predict.ts`)

**Cycles.** Sort the distinct period-start dates. Each consecutive pair forms a completed cycle with `length = start[i+1] − start[i]` days. The last start begins the current cycle.

**Period length of a cycle.** If a `period-end` exists on or after the cycle's start and before the next start, the length is `end − start + 1`. Otherwise use the period-length setting (§ below).

**Average cycle length (auto).** Take the most recent 12 completed cycles with length in [18, 45], and use the median, rounded to the nearest day. With fewer than 3 plausible cycles, use 28. Fixed mode uses the set value.

**Average period length (auto).** The mean of the logged period lengths (cycles with an explicit end) between 2 and 10 days, rounded. With none, use 5. Fixed mode uses the set value.

**Prediction** (requires at least one period start):
- `cycleDay = today − lastStart + 1`
- `nextStart = lastStart + avgCycle`
- `ovulation = nextStart − 14`
- `fertileWindow = [ovulation − 5, ovulation + 1]`
- `predictedPeriod = [nextStart, nextStart + avgPeriod − 1]`
- `lateBy = max(0, today − nextStart)` when no new start has been logged, so the expected day reads "Period expected today". A late status is shown when `lateBy > 0`.
- **Stale history:** when `cycleDay > 60` the prediction is marked stale. Today shows "No period logged since <date>" without a ribbon, and the calendar shows no predictions.
- The calendar shows predicted periods for the next **3** cycles (nextStart + k·avgCycle). The fertile window is shown for the current cycle only.

**Calendar period shading for past cycles:** start through start + periodLength − 1 (using an explicit end where logged).

**No data:** the Today screen shows an empty state and the ribbon is hidden.

## 8. Import and export

### 8.1 `.myd` parser (`io/myd.ts`)

- The input is plain text. Line endings may be CRLF or LF.
- **`<data>…</data>` blocks:**
  - The first line must match `^(\d{4}-\d{2}-\d{2}) !([a-z]+)!\s?(.*)$`.
  - Any further lines in the block are appended to the text, joined with `\n`. Text is trimmed.
- **Code mapping:**
  - `sp` → `period-start`
  - `ep` → `period-end`
  - `hs` → `intimacy`
  - `no` → `note`, with the text
  - Any non-note code that also carries text produces both the mapped entry and a separate note holding the text.
  - Any unknown code becomes a note with text `[<code>] <text>` and adds a warning.
- **Settings:** `<cyclelength N/>` gives a fixed cycle length of N when `<cyclefixed 1/>`, and auto otherwise. `<polength>N</polength>` inside `<reserve>` gives a fixed period length of N when `<polauto>0</polauto>`, and auto otherwise.
- **Invalid dates or malformed blocks** are skipped and listed as warnings with their line numbers. All other `<reserve>` keys are ignored.
- The output is `{ entries, settings, warnings }`. Merging same-day notes happens here.

### 8.2 JSON backup parse (`io/backup.ts`)

- Validate `app === 'p-tracker'`, an integer `schemaVersion` of 1 or less, and the shape of each entry (valid date, known type, notes must have text).
- An unknown higher version is rejected with "This backup is from a newer version of p-tracker. Update the app and try again."
- Any invalid entry rejects the whole file with the first error and its index. Nothing is written.

### 8.3 Import flow (UI)

1. Pick a file. The type is detected by extension, and by content as a fallback.
2. Parse. On failure, show the specific error and change nothing.
3. **Preview:**
   - Counts per type, the date range and any warnings.
   - How many entries are new compared with existing data.
   - Settings: imported settings are applied only if the user ticks "Use settings from this file" (ticked by default when the app has no data).
4. Choose:
   - **Merge** (default): inserts entries whose `(date, type)` doesn't already exist. For notes on a date that already has a note, appends the text unless the existing note already contains it.
   - **Replace everything:** a second confirmation step, then clears all entries and inserts the imported ones.
5. All of this is written in one transaction. The result toast reads "Imported 561 entries".

### 8.4 Export flow

- Build the file in memory.
- If `navigator.canShare({ files })` is true, call `navigator.share` (Android share sheet). Otherwise download it through an object-URL anchor.
- A successful JSON export sets `meta.lastBackupAt`. CSV does not, because it can't be imported back.

## 9. PWA

- **Manifest:**
  - name "p-tracker", `display: standalone`, `start_url: "/"`, portrait orientation.
  - Theme colour `#FBFAFB`, background `#FBFAFB`.
  - Icons: 192, 512 and 512 maskable.
- **Service worker** (Workbox through `vite-plugin-pwa`, `registerType: 'prompt'`): precaches all build assets, including the self-hosted font files. The app works fully offline after the first load.
- **Update prompt:** when a new service worker is waiting, a toast says "Update ready" with a "Reload" action.
- **Storage:** call `navigator.storage.persist()` after the first entry or import and record the result in meta.
- **iOS:**
  - `apple-touch-icon` (180), `apple-mobile-web-app-capable`, and `apple-mobile-web-app-status-bar-style: default`.
  - Layout uses `env(safe-area-inset-*)` padding so it clears the notch and home bar.
  - A one-time dismissible hint ("Add to Home Screen to install") appears in Safari when not running standalone.
- **Viewport:** `width=device-width, initial-scale=1, viewport-fit=cover`. Designed at 360–430px wide. On wider screens the app is centred at 480px maximum.

## 10. Error handling

| Situation | Behaviour |
|---|---|
| IndexedDB unavailable (e.g. private browsing) | A full-screen message explains that the data can't be saved in this mode and how to fix it |
| Write fails (quota) | Toast "Couldn't save. Storage is full." and the sheet stays open with the edits kept |
| Import parse error | Specific message with line or index; nothing written |
| Share cancelled by user | Silent, no error |
| Logging a period start within 10 days of the previous start | Asks to confirm ("This is 6 days after the last period start. Log it anyway?") |
| Period end logged without a preceding start in the same cycle | Allowed, but ignored for period-length calculations |

## 11. Accessibility

- Every interactive element is at least 44×44px.
- Visible focus rings.
- Toggles are `<button role="switch" aria-checked>`.
- Calendar days carry `aria-label`s that include their state ("17 October, predicted period").
- Text contrast is at least 4.5:1 against `--bg`. `--muted` (#7A7078 on #FBFAFB) is 4.57:1; berry on `--berry-soft` is 7.1:1; white on berry is 8.8:1.
- The ribbon has a text equivalent through `aria-label` ("Day 17 of 28. Fertile window ended 4 October.").

## 12. Testing

- **Unit tests (Vitest):**
  - `dates`: DST boundaries, month/year rollover.
  - `cycles` / `predict`: regular and irregular cycles, outlier exclusion, fewer than 3 cycles, late, no data, explicit period ends.
  - `myd`: every code, multi-line notes, CRLF, unknown code, malformed block, settings extraction.
  - `backup`: round trip (export → parse gives identical entries and settings), version rejection, invalid entries.
  - `csv`: quoting of commas, quotes and newlines; BOM.
- **Fixture:** `tests/fixtures/sample.myd`, synthetic, copying the real file's structure and quirks. It contains no real data.
- **Local-only test:** `tests/local/real-history.test.ts` imports `Default_User_*.myd` from the repo root if present and checks that every entry imports without warnings and survives a JSON round trip. It hard-codes nothing from the private file and is skipped when the file is absent (as in CI).
- **E2E (Playwright, Pixel 7 viewport):** import the fixture → see the Today screen populated → log intimacy through a chip → open a calendar day and add a note → export JSON (check the download contents round-trip).

## 13. Deployment

- Cloudflare Pages is connected to `igniteinsights/p-tracker`, building from `main` with `npm run build` and output directory `dist`. Preview deploys run for branches.
- The `*.pages.dev` URL is HTTPS by default, as installation requires. A custom domain is optional and can be added later.
