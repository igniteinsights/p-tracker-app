import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogSheet } from './LogSheet';
import { ToastProvider } from '../common/Toast';
import { repo } from '../../data';
import type { Entry, TrackingType } from '../../domain/types';

function setup(date: string, entries: Entry[] = [], tracking: TrackingType[] = []) {
  const onClose = vi.fn();
  const onChangeDate = vi.fn();
  render(
    <ToastProvider>
      <LogSheet date={date} entries={entries} today="2026-10-05" focusNote={false} tracking={tracking} onClose={onClose} onChangeDate={onChangeDate} />
    </ToastProvider>,
  );
  return { onClose, onChangeDate };
}

beforeEach(async () => { await repo.deleteAll(); });

describe('LogSheet', () => {
  it('saves toggles and a note for the date', async () => {
    const { onClose } = setup('2026-10-03');
    await userEvent.click(await screen.findByRole('switch', { name: 'Intimacy' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Note' }), 'Felt tired');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(await repo.getDay('2026-10-03')).toEqual({ periodStart: false, periodEnd: false, intimacy: true, note: 'Felt tired', tracking: {} });
  });

  it('asks before discarding unsaved changes', async () => {
    const { onClose } = setup('2026-10-03');
    await userEvent.click(await screen.findByRole('switch', { name: 'Intimacy' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('Discard changes?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalled();
    expect((await repo.getDay('2026-10-03')).intimacy).toBe(false);
  });

  it('treats the Android back button like closing, keeping the discard prompt', async () => {
    const { onClose } = setup('2026-10-03');
    await userEvent.click(await screen.findByRole('switch', { name: 'Intimacy' }));
    // What the browser does on back: land on the entry below, then fire popstate.
    history.replaceState(null, '');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('lets an existing entry on a future day be turned off', async () => {
    await repo.saveDay('2026-10-20', { periodStart: true, periodEnd: false, intimacy: false, note: '', tracking: {} });
    const { onClose } = setup('2026-10-20');
    const toggle = await screen.findByRole('switch', { name: 'Period started' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect((await repo.getDay('2026-10-20')).periodStart).toBe(false);
  });

  it('only allows a note on future days', async () => {
    setup('2026-10-20');
    expect(await screen.findByRole('switch', { name: 'Period started' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Intimacy' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Note' })).toBeEnabled();
  });

  it('warns when a new period start is close to another', async () => {
    setup('2026-10-03', [{ id: 'a', date: '2026-09-29', type: 'period-start' }]);
    await userEvent.click(await screen.findByRole('switch', { name: 'Period started' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('This is 4 days after another period start. Log it anyway?')).toBeInTheDocument();
  });

  it('moves between days', async () => {
    const { onChangeDate } = setup('2026-10-03');
    await userEvent.click(await screen.findByRole('button', { name: 'Next day' }));
    expect(onChangeDate).toHaveBeenCalledWith('2026-10-04');
  });
});

describe('LogSheet extra tracking', () => {
  it('shows only the tracking types that are switched on', async () => {
    setup('2026-10-03', [], ['flow']);
    expect(await screen.findByRole('group', { name: 'Flow' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Mood' })).not.toBeInTheDocument();
  });

  it('saves a chosen value and lets it be cleared by tapping again', async () => {
    const { onClose } = setup('2026-10-03', [], ['flow', 'mood']);
    const heavy = await screen.findByRole('button', { name: 'Heavy' });
    await userEvent.click(heavy);
    expect(heavy).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Low' }));
    await userEvent.click(screen.getByRole('button', { name: 'Low' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect((await repo.getDay('2026-10-03')).tracking).toEqual({ flow: 'heavy' });
  });
});
