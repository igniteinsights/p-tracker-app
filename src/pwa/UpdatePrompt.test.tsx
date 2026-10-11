import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sw = vi.hoisted(() => ({ needRefresh: false, update: vi.fn() }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [sw.needRefresh, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: sw.update }),
}));

import { UpdatePrompt } from './UpdatePrompt';

describe('UpdatePrompt', () => {
  beforeEach(() => {
    sw.needRefresh = false;
    sw.update.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version: '1.0.99' }))));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('names the new version and the one on this phone', async () => {
    sw.needRefresh = true;
    render(<UpdatePrompt />);
    expect(await screen.findByText('1.0.99')).toBeInTheDocument();
    expect(screen.getByText(/is ready\. You have/)).toHaveTextContent(`Version 1.0.99 is ready. You have ${__APP_VERSION__}.`);
  });

  it("still shows the current version when the new one can't be fetched", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    sw.needRefresh = true;
    render(<UpdatePrompt />);
    expect(await screen.findByText(`A new version is ready. You have ${__APP_VERSION__}.`)).toBeInTheDocument();
  });

  it('stays hidden when the app is up to date', () => {
    render(<UpdatePrompt />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('offers the new version and reloads into it', async () => {
    sw.needRefresh = true;
    render(<UpdatePrompt />);
    expect(screen.getByRole('alertdialog', { name: 'App update available' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Update now' }));
    expect(sw.update).toHaveBeenCalledWith(true);
  });

  it('can be put off until the app is reopened', async () => {
    sw.needRefresh = true;
    render(<UpdatePrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByRole('alertdialog', { name: 'App update available' })).toBeInTheDocument();
  });
});
