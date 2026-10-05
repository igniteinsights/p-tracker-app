import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CycleHistory } from './CycleHistory';
import { repo } from '../../data';
import { addDays } from '../../domain/dates';
import { DEFAULT_SETTINGS, type Entry } from '../../domain/types';

const starts = ['2026-01-10'];
for (const g of [65, 28, 26, 30, 28]) starts.push(addDays(starts.at(-1)!, g));
const entries: Entry[] = starts.map((date, i) => ({ id: String(i), date, type: 'period-start' }));

beforeEach(async () => { await repo.deleteAll(); });

describe('CycleHistory', () => {
  it('summarises cycles and lists them newest first', () => {
    render(<CycleHistory entries={entries} settings={DEFAULT_SETTINGS} today="2026-07-20" onClose={() => {}} />);
    expect(screen.getByText('28 days')).toBeInTheDocument();          // typical
    expect(screen.getByText('26–65 days')).toBeInTheDocument();       // shortest–longest
    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]).getByText('6 Jul 2026')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Current')).toBeInTheDocument();
    expect(within(rows.at(-1)!).getByText('Long')).toBeInTheDocument();
  });

  it('excludes a cycle from averages', async () => {
    render(<CycleHistory entries={entries} settings={DEFAULT_SETTINGS} today="2026-07-20" onClose={() => {}} />);
    const toggle = screen.getByRole('switch', { name: 'Include cycle from 9 May 2026 in averages' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    await waitFor(async () => expect((await repo.getSettings()).excludedCycles).toEqual(['2026-05-09']));
  });

  it('cannot exclude the current cycle', () => {
    render(<CycleHistory entries={entries} settings={DEFAULT_SETTINGS} today="2026-07-20" onClose={() => {}} />);
    expect(screen.queryByRole('switch', { name: /6 Jul 2026/ })).not.toBeInTheDocument();
  });
});
