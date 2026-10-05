import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComingUpList } from './ComingUpList';
import { RecentCycles } from './RecentCycles';
import { TodayScreen } from './TodayScreen';
import { ToastProvider } from '../common/Toast';
import { predict, type Prediction } from '../../domain/predict';
import { addDays } from '../../domain/dates';
import { DEFAULT_SETTINGS, type Entry } from '../../domain/types';
import { DEFAULT_META } from '../../data/repo';
import type { DataState } from '../../data/useData';

const p: Prediction = {
  today: '2026-10-05', lastStart: '2026-09-19', cycleDay: 17, avgCycle: 28, avgPeriod: 5, lastPeriodLength: 5,
  nextStart: '2026-10-17', ovulation: '2026-10-03', fertileStart: '2026-09-28', fertileEnd: '2026-10-04',
  predictedPeriodEnd: '2026-10-21', lateBy: 0, cyclesLogged: 42, cycleSpan: 28, stale: false,
  range: { low: 26, high: 31, earliest: '2026-10-15', latest: '2026-10-20' }, irregular: false,
};

describe('ComingUpList', () => {
  it('lists the next period with its likely range and the fertile window', () => {
    render(<ComingUpList prediction={p} />);
    expect(screen.getByText('Sat 17 Oct · likely 15–20 Oct')).toBeInTheDocument();
    expect(screen.getByText('12 days')).toBeInTheDocument();
    expect(screen.getByText('Mon 26 Oct – Sun 1 Nov')).toBeInTheDocument();
  });

  it('says how late a period is', () => {
    render(<ComingUpList prediction={{ ...p, today: '2026-10-20', lateBy: 3 }} />);
    expect(screen.getByText('Period late')).toBeInTheDocument();
    expect(screen.getByText('3 days late')).toBeInTheDocument();
  });

  it('renders nothing when predictions are off', () => {
    const { container } = render(<ComingUpList prediction={{ ...p, lastStart: '2024-03-21', stale: true }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

const starts = ['2025-10-14'];
for (const g of [26, 31, 27, 29, 25, 30, 28, 32, 27, 29, 26, 30]) starts.push(addDays(starts.at(-1)!, g));
const entries: Entry[] = starts.map((date, i) => ({ id: String(i), date, type: 'period-start' }));
const today = '2026-10-05';

describe('RecentCycles', () => {
  it('charts recent cycles and opens history', async () => {
    const onOpenHistory = vi.fn();
    render(<RecentCycles entries={entries} settings={DEFAULT_SETTINGS} today={today} onOpenHistory={onOpenHistory} />);
    const chart = screen.getByRole('button', { name: /Recent cycles/ });
    expect(chart).toHaveAccessibleName('Recent cycles: 25, 30, 28, 32, 27, 29, 26 and 30 days, now day 17. Usual range 27–30 days. Open cycle history.');
    expect(screen.getByText('Usual range 27–30 days')).toBeInTheDocument();
    await userEvent.click(chart);
    expect(onOpenHistory).toHaveBeenCalled();
  });

  it('is hidden until there are two completed cycles', () => {
    const { container } = render(<RecentCycles entries={entries.slice(-2)} settings={DEFAULT_SETTINGS} today={today} onOpenHistory={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TodayScreen dashboard', () => {
  it('docks the quick-log chips', () => {
    const data: DataState = { ready: true, entries, settings: DEFAULT_SETTINGS, meta: DEFAULT_META, today, prediction: predict(entries, DEFAULT_SETTINGS, today) };
    render(<ToastProvider><TodayScreen data={data} onOpenCalendar={() => {}} onOpenLog={() => {}} onOpenSettings={() => {}} onOpenHistory={() => {}} /></ToastProvider>);
    expect(screen.getByRole('button', { name: 'Period started' }).closest('.dock')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Coming up' })).toBeInTheDocument();
  });
});

describe('Your cycle facts', () => {
  const stale: Entry[] = ['2023-10-01', '2023-10-29', '2023-11-26', '2023-12-24', '2024-01-21'].map((date, i) => ({ id: `s${i}`, date, type: 'period-start' }));
  const make = (es: Entry[]): DataState => ({ ready: true, entries: es, settings: DEFAULT_SETTINGS, meta: DEFAULT_META, today, prediction: predict(es, DEFAULT_SETTINGS, today) });
  const renderToday = (d: DataState, onOpenHistory = () => {}) =>
    render(<ToastProvider><TodayScreen data={d} onOpenCalendar={() => {}} onOpenLog={() => {}} onOpenSettings={() => {}} onOpenHistory={onOpenHistory} /></ToastProvider>);

  it('keeps typical cycle and cycles logged on Today when history is old', () => {
    renderToday(make(stale));
    expect(screen.getByText('Typical cycle')).toBeInTheDocument();
    expect(screen.getByText('28 days')).toBeInTheDocument();
    expect(screen.getByText('Cycles logged')).toBeInTheDocument();
    expect(screen.getByText('21 Jan 2024')).toBeInTheDocument();
  });

  it('shows the usual range with recent history and opens cycle history', async () => {
    const onOpenHistory = vi.fn();
    renderToday(make(entries), onOpenHistory);
    expect(screen.getByText('29 days · 27–30')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Cycles logged/ }));
    expect(onOpenHistory).toHaveBeenCalled();
  });
});
