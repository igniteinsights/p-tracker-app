import type { ISODate } from '../../domain/dates';
import { cycleHistory } from '../../domain/history';
import { CYCLE_RANGE, type NewEntry, type Settings } from '../../domain/types';
import { recentBars } from './comingUp';

interface RecentCyclesProps {
  entries: readonly Pick<NewEntry, 'date' | 'type'>[];
  settings: Settings;
  today: ISODate;
  onOpenHistory: () => void;
}

const CHART_HEIGHT = 84;

function listJoin(xs: number[]): string {
  return xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
}

export function RecentCycles({ entries, settings, today, onOpenHistory }: RecentCyclesProps) {
  const { rows, summary } = cycleHistory(entries, settings, today);
  const bars = recentBars(rows, today);
  if (!bars.length) return null;

  // Long gaps (missed logging) would flatten everything else, so cap the scale.
  const max = Math.min(CYCLE_RANGE.max + 1, Math.max(summary.high, ...bars.map((b) => b.length)) + 2);
  const y = (days: number) => (Math.min(days, max) / max) * CHART_HEIGHT;
  const hasRange = summary.low !== summary.high;
  const caption = hasRange ? `Usual range ${summary.low}–${summary.high} days` : `Typical ${summary.typical} days`;
  const completed = bars.filter((b) => !b.current).map((b) => b.length);
  const current = bars.find((b) => b.current);
  const label = `Recent cycles: ${listJoin(completed)} days${current ? `, now day ${current.length}` : ''}. ${caption}. Open cycle history.`;

  return (
    <section className="recent">
      <h2 className="today__section-title recent__title">
        <span>Recent cycles</span>
        <span aria-hidden="true">History ›</span>
      </h2>
      <button type="button" className="recent__chart" aria-label={label} onClick={onOpenHistory}>
        <span className="recent__plot" style={{ height: CHART_HEIGHT }} aria-hidden="true">
          <span
            className={`recent__band${hasRange ? '' : ' recent__band--line'}`}
            style={{ bottom: y(summary.low), height: hasRange ? y(summary.high) - y(summary.low) : 2 }}
          />
          {bars.map((b) => (
            <span
              key={b.start}
              className={`recent__bar${b.current ? ' recent__bar--current' : ''}${b.excluded ? ' recent__bar--excluded' : ''}`}
              style={{ height: Math.max(4, y(b.length)) }}
              title={`${b.label}: ${b.length} days${b.current ? ' so far' : ''}${b.excluded ? ' (excluded)' : ''}`}
            />
          ))}
        </span>
        <span className="recent__labels" aria-hidden="true">
          {bars.map((b) => <span key={b.start}>{b.label}</span>)}
        </span>
        <span className="recent__caption" aria-hidden="true">
          <em className={`recent__key${hasRange ? '' : ' recent__key--line'}`} />
          {caption}
        </span>
      </button>
    </section>
  );
}
