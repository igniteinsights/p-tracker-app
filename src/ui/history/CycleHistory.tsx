import { diffDays, formatDayMonth, type ISODate } from '../../domain/dates';
import { cycleHistory, type CycleRow } from '../../domain/history';
import { CYCLE_RANGE, type NewEntry, type Settings } from '../../domain/types';
import { repo } from '../../data';
import { Sheet } from '../common/Sheet';
import './history.css';

interface CycleHistoryProps {
  entries: readonly Pick<NewEntry, 'date' | 'type'>[];
  settings: Settings;
  today: ISODate;
  onClose: () => void;
}

const withYear = (d: ISODate) => `${formatDayMonth(d)} ${d.slice(0, 4)}`;

function Tags({ row }: { row: CycleRow }) {
  const tags = [row.current && 'Current', row.flag === 'long' && 'Long', row.flag === 'short' && 'Short', row.excluded && 'Excluded'].filter(Boolean) as string[];
  return <>{tags.map((t) => <span key={t} className={`history__tag history__tag--${t.toLowerCase()}`}>{t}</span>)}</>;
}

export function CycleHistory({ entries, settings, today, onClose }: CycleHistoryProps) {
  const { rows, summary } = cycleHistory(entries, settings, today);

  function setIncluded(start: ISODate, included: boolean) {
    const excluded = new Set(settings.excludedCycles);
    if (included) excluded.delete(start);
    else excluded.add(start);
    void repo.setSettings({ ...settings, excludedCycles: [...excluded].sort() });
  }

  return (
    <Sheet label="Cycle history" onClose={onClose}>
      <h2 className="sheet-title">Cycle history</h2>
      <dl className="history__summary">
        <div><dt>Typical cycle</dt><dd>{summary.typical} days</dd></div>
        {summary.low !== summary.high && <div><dt>Usual range</dt><dd>{summary.low}–{summary.high} days</dd></div>}
        {summary.shortest !== null && <div><dt>Shortest to longest</dt><dd>{summary.shortest}–{summary.longest} days</dd></div>}
        <div><dt>Excluded</dt><dd>{summary.excluded === 0 ? 'None' : summary.excluded}</dd></div>
      </dl>
      <p className="history__hint">Switch off a cycle to leave it out of averages and predictions, for example after illness or pregnancy. Cycles over {CYCLE_RANGE.max} days are never counted.</p>
      <ul className="history__list">
        {rows.map((row) => (
          <li key={row.start} className={`history__row${row.excluded ? ' history__row--excluded' : ''}`}>
            <div className="history__main">
              <div className="history__top">
                <span className="history__date">{withYear(row.start)}</span>
                <Tags row={row} />
              </div>
              {row.length !== null && (
                <span className="history__bar" aria-hidden="true" style={{ width: `${Math.min(100, (row.length / CYCLE_RANGE.max) * 100)}%` }} />
              )}
              <span className="history__meta">
                {row.length !== null ? `${row.length}-day cycle` : `Day ${diffDays(today, row.start) + 1} so far`}
                {` · period ${row.periodLength} days`}
              </span>
            </div>
            {!row.current && (
              <button
                type="button"
                role="switch"
                aria-checked={!row.excluded}
                aria-label={`Include cycle from ${withYear(row.start)} in averages`}
                className="history__switch"
                onClick={() => setIncluded(row.start, row.excluded)}
              >
                <span className={`toggle${row.excluded ? '' : ' toggle--on'}`} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
