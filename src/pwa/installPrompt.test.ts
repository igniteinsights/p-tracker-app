import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getInstallPrompt, INSTALL_SNOOZE_DAYS, listenForInstallPrompt, promptInstall, shouldOfferInstall } from './installPrompt';

function fireBeforeInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  });
  window.dispatchEvent(e);
  return e;
}

beforeAll(() => listenForInstallPrompt());
afterEach(() => window.dispatchEvent(new Event('appinstalled')));

describe('install prompt', () => {
  it('captures the browser prompt and suppresses Chrome\'s default mini-infobar', () => {
    const e = fireBeforeInstall();
    expect(e.defaultPrevented).toBe(true);
    expect(getInstallPrompt()).not.toBeNull();
  });

  it('shows the browser dialog once, then forgets it', async () => {
    const e = fireBeforeInstall('dismissed');
    expect(await promptInstall()).toBe('dismissed');
    expect(e.prompt).toHaveBeenCalledOnce();
    expect(getInstallPrompt()).toBeNull();
  });

  it('forgets the prompt once the app is installed', () => {
    fireBeforeInstall();
    window.dispatchEvent(new Event('appinstalled'));
    expect(getInstallPrompt()).toBeNull();
  });

  it('reports unavailable when there is nothing to prompt', async () => {
    expect(await promptInstall()).toBe('unavailable');
  });
});

describe('shouldOfferInstall', () => {
  const now = new Date('2026-10-05T09:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

  it('offers when the browser can install and the app is not installed', () => {
    expect(shouldOfferInstall({ available: true, standalone: false, dismissedAt: null }, now)).toBe(true);
  });

  it('never offers inside the installed app or without a browser prompt', () => {
    expect(shouldOfferInstall({ available: true, standalone: true, dismissedAt: null }, now)).toBe(false);
    expect(shouldOfferInstall({ available: false, standalone: false, dismissedAt: null }, now)).toBe(false);
  });

  it(`waits ${INSTALL_SNOOZE_DAYS} days after "Not now"`, () => {
    expect(shouldOfferInstall({ available: true, standalone: false, dismissedAt: daysAgo(10) }, now)).toBe(false);
    expect(shouldOfferInstall({ available: true, standalone: false, dismissedAt: daysAgo(15) }, now)).toBe(true);
  });
});
