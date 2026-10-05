import { act } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallBanner } from './InstallBanner';
import { listenForInstallPrompt } from './installPrompt';
import { repo } from '../data';

function fireBeforeInstall() {
  const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  });
  act(() => { window.dispatchEvent(e); });
  return e;
}

beforeAll(() => listenForInstallPrompt());
beforeEach(async () => { await repo.setMeta({ installDismissedAt: null }); });
afterEach(() => { act(() => { window.dispatchEvent(new Event('appinstalled')); }); });

describe('InstallBanner', () => {
  it('stays hidden until the browser says the app can be installed', () => {
    render(<InstallBanner dismissedAt={null} />);
    expect(screen.queryByText(/Install p-tracker/)).not.toBeInTheDocument();
    fireBeforeInstall();
    expect(screen.getByText(/Install p-tracker/)).toBeInTheDocument();
  });

  it('opens the browser install dialog from Install', async () => {
    render(<InstallBanner dismissedAt={null} />);
    const e = fireBeforeInstall();
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(e.prompt).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText(/Install p-tracker/)).not.toBeInTheDocument());
  });

  it('remembers "Not now"', async () => {
    render(<InstallBanner dismissedAt={null} />);
    fireBeforeInstall();
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    await waitFor(async () => expect((await repo.getMeta()).installDismissedAt).not.toBeNull());
  });

  it('stays hidden while snoozed', () => {
    render(<InstallBanner dismissedAt={new Date().toISOString()} />);
    fireBeforeInstall();
    expect(screen.queryByText(/Install p-tracker/)).not.toBeInTheDocument();
  });
});
