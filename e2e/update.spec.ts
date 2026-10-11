import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Publishes a pretend release by editing the served build, then puts it back
const SW = 'dist/sw.js';
const VERSION = 'dist/version.json';

const reopen = (page: Page) => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

test('offers a new release with its version and notes, then updates to it', async ({ page }) => {
  const sw = readFileSync(SW, 'utf8');
  const versionFile = readFileSync(VERSION, 'utf8');
  const { version: installed, releases } = JSON.parse(versionFile) as { version: string; releases: unknown[] };
  const next = installed.replace(/\d+$/, (n) => String(Number(n) + 1));

  try {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await reopen(page);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    writeFileSync(SW, `${sw}\n// e2e release ${next}\n`);
    writeFileSync(VERSION, JSON.stringify({ version: next, releases: [{ version: next, notes: ['E2E pretend change.'] }, ...releases] }));

    // Coming back to the app checks for the new release
    await reopen(page);
    const dialog = page.getByRole('alertdialog', { name: 'App update available' });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(dialog).toContainText(`Version ${next} is ready. You have ${installed}.`);
    await expect(dialog.getByRole('heading', { name: "What's new" })).toBeVisible();
    await expect(dialog.getByRole('listitem').first()).toHaveText('E2E pretend change.');

    // Later hides it until the app is reopened
    await dialog.getByRole('button', { name: 'Later' }).click();
    await expect(dialog).toBeHidden();
    await reopen(page);
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Update now' }).click();
    await page.waitForEvent('load');
    await expect(page.getByRole('button', { name: 'Calendar', exact: true })).toBeVisible();
    await reopen(page);
    await page.waitForTimeout(1000);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  } finally {
    writeFileSync(SW, sw);
    writeFileSync(VERSION, versionFile);
  }
});
