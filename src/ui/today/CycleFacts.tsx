import { formatDayMonth, formatMonthYear, type ISODate } from '../../domain/dates';
import { cycleHistory } from '../../domain/history';
import type { Prediction } from '../../domain/predict';
import type { NewEntry, Settings } from '../../domain/types';

interface CycleFactsProps {
  prediction: Prediction;
  entries: readonly Pick<NewEntry, 'date' | 'type'>[];
  settings: Settings;
  today: ISODate;
  onOpenHistory: () => void;
}

/** Always-available facts, so Today stays useful even when predictions are off. */
export function CycleFacts({ prediction: p, entries, settings, today, onOpenHistory }: CycleFactsProps) {
  const { rows, summary } = cycleHistory(entries, settings, today);
  const sameYear = p.lastStart.slice(0, 4) === today.slice(0, 4);
  const lastDate = sameYear ? formatDayMonth(p.lastStart) : `${formatDayMonth(p.lastStart)} ${p.lastStart.slice(0, 4)}`;
  const typical = summary.low !== summary.high ? `${summary.typical} days · ${summary.low}–${summary.high}` : `${summary.typical} days`;
  const first = rows.at(-1)?.start;

  return (
    <section className="facts-section" aria-labelledby="facts-title">
      <h2 id="facts-title" className="today__section-title">Your cycle</h2>
      <div className="facts">
        <div className="facts__cell">
          <span className="facts__label">Last period</span>
          <span className="facts__value">{lastDate}</span>
          <small>{p.lastPeriodLength} days</small>
        </div>
        <button type="button" className="facts__cell facts__cell--link" onClick={onOpenHistory}>
          <span className="facts__label">Typical cycle</span>
          <span className="facts__value">{typical}</span>
          <small>{summary.completed} completed</small>
        </button>
        <button type="button" className="facts__cell facts__cell--link facts__cell--wide" onClick={onOpenHistory}>
          <span className="facts__label">Cycles logged</span>
          <span className="facts__value">{p.cyclesLogged}</span>
          {first && <small>since {formatMonthYear(first)}</small>}
        </button>
      </div>
    </section>
  );
}
