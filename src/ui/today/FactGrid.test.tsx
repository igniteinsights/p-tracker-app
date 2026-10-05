import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FactGrid } from './FactGrid';
import type { Prediction } from '../../domain/predict';

const p: Prediction = {
  today: '2026-10-05', lastStart: '2026-09-19', cycleDay: 17, avgCycle: 28, avgPeriod: 5, lastPeriodLength: 5,
  nextStart: '2026-10-17', ovulation: '2026-10-03', fertileStart: '2026-09-28', fertileEnd: '2026-10-04',
  predictedPeriodEnd: '2026-10-21', lateBy: 0, cyclesLogged: 42, cycleSpan: 28, stale: false,
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
