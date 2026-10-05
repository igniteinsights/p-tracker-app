import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LockScreen } from './LockScreen';
import { LockGate } from './LockGate';
import { ToastProvider } from '../common/Toast';
import { repo } from '../../data';
import { DEFAULT_META, type Meta } from '../../data/repo';
import { hashPin } from '../../pwa/pin';

async function metaWithPin(pin = '1234', extra: Partial<Meta> = {}): Promise<Meta> {
  const { hash, salt } = await hashPin(pin);
  return { ...DEFAULT_META, pinHash: hash, pinSalt: salt, pinLength: pin.length, ...extra };
}

async function typePin(pin: string) {
  for (const d of pin) await userEvent.click(screen.getByRole('button', { name: d }));
}

beforeEach(async () => {
  await repo.deleteAll();
  await repo.setMeta({ pinHash: null, pinSalt: null, pinLength: null });
  try { localStorage.clear(); } catch { /* ignore */ }
});
afterEach(() => { vi.useRealTimers(); });

describe('LockScreen', () => {
  it('unlocks with the right PIN', async () => {
    const onUnlock = vi.fn();
    render(<ToastProvider><LockScreen meta={await metaWithPin()} onUnlock={onUnlock} /></ToastProvider>);
    expect(screen.getByRole('heading', { name: 'p-tracker is locked' })).toBeInTheDocument();
    await typePin('1234');
    await waitFor(() => expect(onUnlock).toHaveBeenCalled());
  });

  it('pauses for 30 seconds after 5 wrong tries', async () => {
    render(<ToastProvider><LockScreen meta={await metaWithPin()} onUnlock={() => {}} /></ToastProvider>);
    for (let i = 0; i < 5; i++) {
      await typePin('9999');
      await screen.findByText(/Wrong PIN/);
    }
    expect(await screen.findByText(/Try again in \d+ seconds/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
  });

  it('can erase everything when the PIN is forgotten', async () => {
    await repo.saveDay('2026-10-01', { periodStart: false, periodEnd: false, intimacy: true, note: '', tracking: {} });
    const meta = await metaWithPin();
    await repo.setMeta(meta);
    const onUnlock = vi.fn();
    render(<ToastProvider><LockScreen meta={meta} onUnlock={onUnlock} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Forgot PIN?' }));
    await userEvent.type(screen.getByLabelText('Type erase to confirm'), 'erase');
    await userEvent.click(screen.getByRole('button', { name: 'Erase everything' }));
    await waitFor(() => expect(onUnlock).toHaveBeenCalled());
    expect(await repo.listEntries()).toEqual([]);
    expect((await repo.getMeta()).pinHash).toBeNull();
  });
});

describe('LockGate', () => {
  it('shows nothing of the app until unlocked when a PIN is set', async () => {
    render(<ToastProvider><LockGate meta={await metaWithPin()}><p>Private content</p></LockGate></ToastProvider>);
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
    await typePin('1234');
    expect(await screen.findByText('Private content')).toBeInTheDocument();
  });

  it('shows the app straight away without a PIN', () => {
    render(<ToastProvider><LockGate meta={DEFAULT_META}><p>Private content</p></LockGate></ToastProvider>);
    expect(screen.getByText('Private content')).toBeInTheDocument();
  });

  it('locks again after being away longer than the chosen time', async () => {
    const meta = await metaWithPin('1234', { lockAfter: '1m' });
    render(<ToastProvider><LockGate meta={meta}><p>Private content</p></LockGate></ToastProvider>);
    await typePin('1234');
    await screen.findByText('Private content');
    const now = Date.now();
    const spy = vi.spyOn(Date, 'now');
    const setVisibility = (state: 'hidden' | 'visible') => {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    };
    spy.mockReturnValue(now);
    setVisibility('hidden');
    spy.mockReturnValue(now + 30_000);
    setVisibility('visible');
    expect(screen.getByText('Private content')).toBeInTheDocument();
    setVisibility('hidden');
    spy.mockReturnValue(now + 30_000 + 61_000);
    setVisibility('visible');
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'p-tracker is locked' })).toBeInTheDocument();
  });
});
