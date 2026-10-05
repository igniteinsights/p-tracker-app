import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatchUpCard } from './CatchUpCard';
import { MonthCard } from './MonthCard';
import { ThisCycleCard, cycleStats } from './ThisCycleCard';
import { TodayScreen } from './TodayScreen';
import { ToastProvider } from '../common/Toast';
import { repo } from '../../data';
import { DEFAULT_META } from '../../data/repo';
import type { DataState } from '../../data/useData';
import { predict } from '../../domain/predict';
import { DEFAULT_SETTINGS, type Entry } from '../../domain/types';

const today = '2026-10-05';
const recent: Entry[] = [
  ...['2026-06-27', '2026-07-25', '2026-08-22', '2026-09-19'].map((date, i): Entry => ({ id: `p${i}`, date, type: 'period-start' })),
  { id: 'i1', date: '2026-09-27', type: 'intimacy' },
  { id: 'i2', date: '2026-10-02', type: 'intimacy' },
  { id: 'i3', date: '2026-09-10', type: 'intimacy' }, // previous cycle
  { id: 'f1', date: '2026-09-19', type: 'flow', value: 'heavy' },
  { id: 'f2', date: '2026-09-20', type: 'flow', value: 'heavy' },
  { id: 'f3', date: '2026-09-21', type: 'flow', value: 'light' },
  { id: 'm1', date: '2026-10-01', type: 'mood', value: 'low' },
  { id: 'n1', date: '2026-10-03', type: 'note', text: 'Felt tired, early night' },
];
const stale: Entry[] = ['2023-12-24', '2024-01-21'].map((date, i) => ({ id: `s${i}`, date, type: 'period-start' }));
const state = (entries: Entry[]): DataState => ({ ready: true, entries, settings: DEFAULT_SETTINGS, meta: DEFAULT_META, today, prediction: predict(entries, DEFAULT_SETTINGS, today) });
const noop = () => {};

beforeEach(async () => { await repo.deleteAll(); });

describe('CatchUpCard', () => {
  it('logs a chosen start date', async () => {
    render(<ToastProvider><CatchUpCard lastStart="2024-01-21" today={today} /></ToastProvider>);
    expect(screen.getByText(/Your history ends in January 2024/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pick the date' }));
    const input = screen.getByLabelText('Start date');
    expect(input).toHaveAttribute('max', today);
    await userEvent.type(input, '2026-09-30');
    await userEvent.click(screen.getByRole('button', { name: 'Log it' }));
    await waitFor(async () => expect((await repo.getDay('2026-09-30')).periodStart).toBe(true));
  });

  it('logs today in one tap', async () => {
    render(<ToastProvider><CatchUpCard lastStart="2024-01-21" today={today} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'It started today' }));
    await waitFor(async () => expect((await repo.getDay(today)).periodStart).toBe(true));
  });
});

describe('MonthCard', () => {
  it('shows this month with stage colours and opens the calendar', async () => {
    const onOpen = vi.fn();
    const d = state(recent);
    render(<MonthCard entries={d.entries} prediction={d.prediction} settings={d.settings} today={today} onOpenCalendar={onOpen} />);
    const card = screen.getByRole('button', { name: /This month: October 2026/ });
    expect(within(card).getAllByText(/^\d+$/)).toHaveLength(31);
    expect(within(card).getByText('5')).toHaveClass('mini__day--today');
    expect(within(card).getByText('10')).toHaveClass('mini__day--luteal');
    await userEvent.click(card);
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('ThisCycleCard', () => {
  it('counts this cycle only and picks the most common tracked values', () => {
    expect(cycleStats(recent, '2026-09-19', today)).toEqual({
      stats: [
        { value: 2, label: 'Intimacy days' },
        { value: 2, label: 'Heavy flow days' },
        { value: 1, label: 'Low mood day' },
      ],
      latestNote: { date: '2026-10-03', text: 'Felt tired, early night' },
    });
  });

  it('shows the counts and latest note', () => {
    render(<ThisCycleCard entries={recent} lastStart="2026-09-19" today={today} />);
    expect(screen.getByText('Heavy flow days')).toBeInTheDocument();
    expect(screen.getByText('Felt tired, early night')).toBeInTheDocument();
  });
});

describe('TodayScreen cards', () => {
  const renderToday = (d: DataState) =>
    render(<ToastProvider><TodayScreen data={d} onOpenCalendar={noop} onOpenLog={noop} onOpenSettings={noop} onOpenHistory={noop} /></ToastProvider>);

  it('offers to catch up and shows this month when history is old', () => {
    renderToday(state(stale));
    expect(screen.getByRole('heading', { name: 'When did your most recent period start?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /This month/ })).toBeInTheDocument();
    expect(screen.queryByText('This cycle so far')).not.toBeInTheDocument();
  });

  it('shows this month and this cycle, without the catch-up card, when predictions are running', () => {
    renderToday(state(recent));
    expect(screen.queryByText(/When did your most recent period start/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /This month/ })).toBeInTheDocument();
    expect(screen.getByText('This cycle so far')).toBeInTheDocument();
  });
});
