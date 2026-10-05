import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

test('import MyDays, log a day, add a note, export a backup', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
  await page.goto('/');

  await expect(page.getByText('Start your history')).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Import from MyDays/ }).click();
  await page.getByLabel('Choose a file').setInputFiles('tests/fixtures/sample.myd');
  await expect(page.getByText('8 period starts, 1 period end, 2 intimacy, 3 notes')).toBeVisible();
  await page.getByRole('button', { name: 'Merge' }).click();
  await expect(page.getByText('Imported 14 entries')).toBeVisible();

  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recent cycles' })).toBeVisible();
  await page.getByRole('button', { name: 'Intimacy', exact: true }).click();
  await expect(page.getByText('Intimacy logged')).toBeVisible();

  const now = new Date();
  const label = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, today`;
  await page.getByRole('button', { name: 'Calendar' }).click();
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
  await page.getByRole('textbox', { name: 'Note' }).fill('E2E note, with "quotes"');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export backup/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^p-tracker-export-\d{4}-\d{2}-\d{2}\.json$/);
  const backup = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(backup.schemaVersion).toBe(2);
  expect(backup.entries).toHaveLength(16);
  expect(backup.entries.some((e: { text?: string }) => e.text === 'E2E note, with "quotes"')).toBe(true);
});

test('the back button closes the log sheet and protects unsaved changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Calendar' }).click();
  const today = page.getByRole('button', { name: /, today/ });

  await today.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();

  await today.click();
  await page.getByRole('textbox', { name: 'Note' }).fill('draft');
  await page.goBack();
  await expect(page.getByText('Discard changes?')).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Discard changes?')).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Note' })).toHaveValue('draft');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('readable labels, reachable buttons and toasts that stay clear of sheets', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation')).toBeVisible();

  // Inactive nav labels meet 4.5:1 against the nav background
  const ratio = await page.evaluate(() => {
    const rgb = (s: string) => s.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const item = document.querySelectorAll('.nav__item')[1] as HTMLElement;
    const fg = lum(rgb(getComputedStyle(item).color));
    const bg = lum(rgb(getComputedStyle(document.querySelector('.nav')!).backgroundColor));
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);

  // Undo is a full-size touch target
  await page.getByRole('button', { name: 'Intimacy', exact: true }).click();
  const undo = await page.getByRole('button', { name: 'Undo' }).boundingBox();
  expect(undo!.height).toBeGreaterThanOrEqual(44);

  // With a sheet open, the toast moves to the top so it can't cover Save
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const toast = await page.locator('.toast').boundingBox();
  const save = await page.getByRole('button', { name: 'Save' }).boundingBox();
  expect(toast!.y + toast!.height).toBeLessThan(save!.y);
  await page.keyboard.press('Escape');

  // The import warnings toggle is a full-size touch target
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Import from MyDays/ }).click();
  await page.getByLabel('Choose a file').setInputFiles('tests/fixtures/sample.myd');
  const summary = await page.locator('.import__warnings summary').boundingBox();
  expect(summary!.height).toBeGreaterThanOrEqual(44);
});

test('offers to install when Chrome says the app is installable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.evaluate(() => {
    const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: () => { (window as unknown as { prompted: boolean }).prompted = true; return Promise.resolve(); },
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });
    window.dispatchEvent(e);
  });
  const banner = page.getByRole('region', { name: 'Install app' });
  await expect(banner).toBeVisible();
  // The banner pushes content down rather than covering it
  const b = await banner.boundingBox();
  const heading = await page.getByRole('heading', { name: 'Start your history' }).boundingBox();
  expect(b!.y + b!.height).toBeLessThanOrEqual(heading!.y);
  await page.screenshot({ path: 'test-results/install-banner.png' });
  await banner.getByRole('button', { name: 'Install' }).click();
  expect(await page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
  await expect(banner).toBeHidden();
});

test('cycle history exclusions and the calendar intimacy filter', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Import from MyDays/ }).click();
  await page.getByLabel('Choose a file').setInputFiles('tests/fixtures/sample.myd');
  await page.getByRole('button', { name: 'Merge' }).click();
  await expect(page.getByText(/Imported \d+ entries/)).toBeVisible();

  await page.getByRole('button', { name: /Cycle history/ }).click();
  const history = page.getByRole('dialog', { name: 'Cycle history' });
  await expect(history.getByText('Long', { exact: true })).toBeVisible();
  await history.getByRole('switch', { name: 'Include cycle from 2 Sep 2023 in averages' }).click();
  await expect(history.getByText('Excluded', { exact: true }).first()).toBeVisible();
  await expect(history.locator('.history__summary')).toContainText('1');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Intimacy', exact: true }).click();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  const chip = page.getByRole('button', { name: 'Intimacy', exact: true });
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.day--hit-intimacy.day--today')).toBeVisible();
  await expect(page.locator('.month__count').filter({ hasText: '1 day' }).first()).toBeVisible();
});

test('PIN lock hides the app on reopen until the PIN is entered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText(/stored only on this phone/)).toBeVisible();
  await page.getByRole('switch', { name: /PIN lock/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Set a PIN' });
  for (const d of '2468') await sheet.getByRole('button', { name: d, exact: true }).click();
  await sheet.getByRole('button', { name: 'Next' }).click();
  for (const d of '2468') await sheet.getByRole('button', { name: d, exact: true }).click();
  await sheet.getByRole('button', { name: 'Turn on PIN lock' }).click();
  await expect(page.getByText('PIN lock turned on')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'p-tracker is locked' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  for (const d of '1111') await page.getByRole('button', { name: d, exact: true }).click();
  await expect(page.getByText(/Wrong PIN/)).toBeVisible();
  for (const d of '2468') await page.getByRole('button', { name: d, exact: true }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('extra tracking: switch on, log from the calendar, see it again', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: /Flow level/ }).click();
  await page.getByRole('switch', { name: /^Mood/ }).click();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.getByRole('button', { name: /, today/ }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('group', { name: 'Flow' }).getByRole('button', { name: 'Heavy' }).click();
  await sheet.getByRole('group', { name: 'Mood' }).getByRole('button', { name: 'Anxious' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
  await expect(page.getByRole('button', { name: /, today.*heavy flow, anxious mood/ })).toBeVisible();
  await page.getByRole('button', { name: /, today/ }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Heavy' })).toHaveAttribute('aria-pressed', 'true');
});
