import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { FactGrid } from './FactGrid';
import type { Prediction } from '../../domain/predict';

const p: Prediction = {
  today: '2026-10-05', lastStart: '2026-09-19', cycleDay: 17, avgCycle: 28, avgPeriod: 5, lastPeriodLength: 5,
  nextStart: '2026-10-17', ovulation: '2026-10-03', fertileStart: '2026-09-28', fertileEnd: '2026-10-04',
  predictedPeriodEnd: '2026-10-21', lateBy: 0, cyclesLogged: 42, cycleSpan: 28, stale: false, range: null, irregular: false,
};

describe('FactGrid', () => {
  it('omits the year for a last period this year', () => {
    render(<FactGrid prediction={p} />);
    expect(screen.getByText('19 Sep, 5 days')).toBeInTheDocument();
  });

  it('shows the year when the last period was in another year', () => {
    render(<FactGrid prediction={{ ...p, lastStart: '2024-03-21', cycleDay: 929, stale: true }} />);
    expect(screen.getByText('21 Mar 2024, 5 days')).toBeInTheDocument();
  });
});

describe('FactGrid range and history', () => {
  it('shows the typical range next to the average cycle', () => {
    render(<FactGrid prediction={{ ...p, range: { low: 26, high: 31, earliest: '2026-10-15', latest: '2026-10-20' } }} />);
    expect(screen.getByText('28 days · 26–31')).toBeInTheDocument();
  });

  it('says the fertile window is off for irregular cycles', () => {
    render(<FactGrid prediction={{ ...p, irregular: true }} />);
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('opens cycle history from the average and count facts', async () => {
    const onOpenHistory = vi.fn();
    render(<FactGrid prediction={p} onOpenHistory={onOpenHistory} />);
    await userEvent.click(screen.getByRole('button', { name: /Average cycle/ }));
    await userEvent.click(screen.getByRole('button', { name: /Cycles logged/ }));
    expect(onOpenHistory).toHaveBeenCalledTimes(2);
  });
});
