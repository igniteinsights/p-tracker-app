import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TodayScreen } from './TodayScreen';
import { ToastProvider } from '../common/Toast';
import { predict } from '../../domain/predict';
import { DEFAULT_SETTINGS, type Entry } from '../../domain/types';
import { DEFAULT_META } from '../../data/repo';
import type { DataState } from '../../data/useData';

const entries: Entry[] = ['2026-06-27', '2026-07-25', '2026-08-22', '2026-09-19'].map((date, i) => ({ id: String(i), date, type: 'period-start' }));
const today = '2026-10-05';
const state = (irregular: boolean): DataState => {
  const settings = { ...DEFAULT_SETTINGS, irregular };
  return { ready: true, entries, settings, meta: DEFAULT_META, today, prediction: predict(entries, settings, today) };
};
const noop = () => {};

describe('TodayScreen', () => {
  it('shows the ribbon and countdown normally', () => {
    render(<ToastProvider><TodayScreen data={state(false)} onOpenCalendar={noop} onOpenLog={noop} onOpenSettings={noop} onOpenHistory={noop} /></ToastProvider>);
    expect(screen.getByRole('button', { name: /^Day \d+ of \d+/ })).toBeInTheDocument();
  });

  it('shows the cycle day without predictions when cycles are irregular', () => {
    render(<ToastProvider><TodayScreen data={state(true)} onOpenCalendar={noop} onOpenLog={noop} onOpenSettings={noop} onOpenHistory={noop} /></ToastProvider>);
    expect(screen.getByRole('heading', { name: /17/ })).not.toHaveTextContent('of 28');
    expect(screen.getByText('Predictions are off for irregular cycles.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Day \d+ of \d+/ })).not.toBeInTheDocument();
  });
});

describe('TodayScreen stage line', () => {
  it('names the current cycle stage', () => {
    render(<ToastProvider><TodayScreen data={state(false)} onOpenCalendar={noop} onOpenLog={noop} onOpenSettings={noop} onOpenHistory={noop} /></ToastProvider>);
    expect(screen.getByText('Luteal phase')).toBeInTheDocument();
    expect(screen.getByText(/after ovulation, until your next period/i)).toBeInTheDocument();
  });

  it('is hidden when predictions are off', () => {
    render(<ToastProvider><TodayScreen data={state(true)} onOpenCalendar={noop} onOpenLog={noop} onOpenSettings={noop} onOpenHistory={noop} /></ToastProvider>);
    expect(screen.queryByText('Luteal phase')).not.toBeInTheDocument();
  });
});
