import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickLog } from './QuickLog';
import { ToastProvider } from '../common/Toast';
import { repo } from '../../data';
import type { Entry } from '../../domain/types';

function setup(entries: Entry[] = []) {
  const onNote = () => {};
  render(<ToastProvider><QuickLog entries={entries} today="2026-10-05" onNote={onNote} /></ToastProvider>);
}

beforeEach(async () => { await repo.deleteAll(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('QuickLog', () => {
  it('logs intimacy for today and offers undo', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Intimacy' }));
    expect(await screen.findByText('Intimacy logged')).toBeInTheDocument();
    expect((await repo.getDay('2026-10-05')).intimacy).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect((await repo.getDay('2026-10-05')).intimacy).toBe(false));
  });

  it('shows an error when saving fails', async () => {
    vi.spyOn(repo, 'toggleEntry').mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'));
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Intimacy' }));
    expect(await screen.findByText("Couldn't save. Storage is full.")).toBeInTheDocument();
  });

  it('undo restores the state from before the tap, even if it changed since', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Intimacy' }));
    await screen.findByText('Intimacy logged');
    await repo.toggleEntry('2026-10-05', 'intimacy'); // removed elsewhere, e.g. in the log sheet
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await new Promise((r) => setTimeout(r, 50));
    expect((await repo.getDay('2026-10-05')).intimacy).toBe(false);
  });

  it('ignores future-dated starts in the too-soon check', async () => {
    setup([{ id: 'f', date: '2026-10-08', type: 'period-start' }]);
    await userEvent.click(screen.getByRole('button', { name: 'Period started' }));
    expect(await screen.findByText('Period start logged')).toBeInTheDocument();
  });

  it('asks before logging a period start within 10 days of another', async () => {
    setup([{ id: 'x', date: '2026-09-29', type: 'period-start' }]);
    await userEvent.click(screen.getByRole('button', { name: 'Period started' }));
    expect(screen.getByText('This is 6 days after the last period start. Log it anyway?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Log it' }));
    await waitFor(async () => expect((await repo.getDay('2026-10-05')).periodStart).toBe(true));
  });
});
