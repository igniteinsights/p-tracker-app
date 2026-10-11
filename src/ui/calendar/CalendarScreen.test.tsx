import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarScreen } from './CalendarScreen';
import { predict } from '../../domain/predict';
import { DEFAULT_SETTINGS, type Entry } from '../../domain/types';
import { DEFAULT_META } from '../../data/repo';
import type { DataState } from '../../data/useData';

const entries: Entry[] = [
  { id: '1', date: '2026-09-19', type: 'period-start' },
  { id: '2', date: '2026-10-02', type: 'intimacy' },
  { id: '3', date: '2026-10-04', type: 'intimacy' },
  { id: '4', date: '2026-10-03', type: 'note', text: 'x' },
];
const today = '2026-10-05';
const data: DataState = {
  ready: true, entries, settings: DEFAULT_SETTINGS, meta: DEFAULT_META, today,
  prediction: predict(entries, DEFAULT_SETTINGS, today),
};

describe('CalendarScreen filters', () => {
  it('shows only intimacy days, with a count, when the Intimacy filter is on', async () => {
    render(<CalendarScreen data={data} onOpenLog={() => {}} />);
    const chip = screen.getByRole('button', { name: 'Intimacy' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^2 October 2026/ })).toHaveClass('day--hit');
    expect(screen.getByRole('button', { name: /^3 October 2026/ })).toHaveClass('day--dim');
    const october = screen.getByRole('heading', { name: 'October' }).parentElement!;
    expect(within(october).getByText('2 days')).toBeInTheDocument();
    const november = screen.getByRole('heading', { name: 'November' }).parentElement!;
    expect(within(november).queryByText(/days?$/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByRole('button', { name: /^3 October 2026/ })).not.toHaveClass('day--dim');
  });
});

describe('CalendarScreen stages', () => {
  it('tints days by stage, names each stage on its first day, and rings today', () => {
    render(<CalendarScreen data={data} onOpenLog={() => {}} />);
    const today5 = screen.getByRole('button', { name: /^5 October 2026, today/ });
    expect(today5).toHaveClass('day--luteal');
    expect(today5).toHaveClass('day--today');
    expect(within(today5).getByText('Luteal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^6 October 2026/ })).toHaveClass('day--luteal', 'day--future');
    expect(screen.getByText('Low fertility')).toBeInTheDocument();
    expect(screen.getByText(/lower chance of pregnancy, not no chance/i)).toBeInTheDocument();
  });
});

describe('CalendarScreen without predictions', () => {
  const old: Entry[] = [{ id: '1', date: '2024-02-08', type: 'period-start' }];
  const stale: DataState = { ...data, entries: old, prediction: predict(old, DEFAULT_SETTINGS, today) };

  it('asks for the latest period when history is out of date', () => {
    render(<CalendarScreen data={stale} onOpenLog={() => {}} />);
    expect(screen.getByRole('heading', { name: 'When did your most recent period start?' })).toBeInTheDocument();
    expect(document.querySelectorAll('.day--predicted')).toHaveLength(0);
  });

  it('says predictions are off when Irregular cycles is on', () => {
    const settings = { ...DEFAULT_SETTINGS, irregular: true };
    render(<CalendarScreen data={{ ...data, settings, prediction: predict(entries, settings, today) }} onOpenLog={() => {}} />);
    expect(screen.getByText(/Predictions are off because Irregular cycles is on/)).toBeInTheDocument();
  });

  it('shows no notice when predictions are on', () => {
    render(<CalendarScreen data={data} onOpenLog={() => {}} />);
    expect(screen.queryByText(/Predictions are off/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /most recent period/ })).not.toBeInTheDocument();
    expect(document.querySelectorAll('.day--predicted').length).toBeGreaterThan(0);
  });
});
