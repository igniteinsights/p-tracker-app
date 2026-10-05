import { memo } from 'react';
import { addDays, MONTHS, weekdayIndex, type ISODate } from '../../domain/dates';
import { dayAriaLabel, dayInfo, filterCount, matchesFilter, monthCells, PHASE_NAMES, phaseGroup, type CalendarFilter, type CalendarIndex, type MonthRef } from './monthModel';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface MonthProps {
  month: MonthRef;
  index: CalendarIndex;
  today: ISODate;
  filter: CalendarFilter;
  onOpenDay: (date: ISODate) => void;
}

export const Month = memo(function Month({ month, index, today, filter, onOpenDay }: MonthProps) {
  const isFuture = month.year * 12 + month.month > Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7));
  // Counts are of logged days, so future months have nothing to count
  const count = filter === 'all' || isFuture ? null : filterCount(month, index, today, filter);
  return (
    <>
      <div className="month__head">
        <h2>{MONTHS[month.month - 1]}</h2>
        <span>{count !== null && <span className="month__count">{count === 1 ? '1 day' : `${count} days`}</span>}{month.year}</span>
      </div>
      <div className="month__grid">
        {DOW.map((d, i) => <span key={i} className="month__dow" aria-hidden="true">{d}</span>)}
        {monthCells(month).map((date, i) => {
          if (!date) return <span key={`b${i}`} />;
          const info = dayInfo(date, index, today);
          const filtered = filter !== 'all';
          const hit = filtered && matchesFilter(info, filter);
          const group = phaseGroup(info.phase);
          const prevGroup = phaseGroup(index.phase.get(addDays(date, -1)));
          const nextGroup = phaseGroup(index.phase.get(addDays(date, 1)));
          const col = weekdayIndex(date);
          const lastOfMonth = addDays(date, 1).slice(5, 7) !== date.slice(5, 7);
          const runStart = group && (col === 0 || date.endsWith('-01') || prevGroup !== group);
          const runEnd = group && (col === 6 || lastOfMonth || nextGroup !== group);
          // Name each stage where it begins (and on the 1st, if it carries over from last month)
          const stage = !filtered && group && group !== 'period' && (prevGroup !== group || date.endsWith('-01')) ? PHASE_NAMES[group] : null;
          const cls = (filtered
            ? ['day', hit ? `day--hit day--hit-${filter}` : 'day--dim', info.today && 'day--today']
            : ['day', info.phase && `day--${info.phase}`, info.future && 'day--future', runStart && 'day--run-start', runEnd && 'day--run-end',
               info.period && 'day--period', info.predicted && 'day--predicted', info.possible && 'day--possible', stage && 'day--labelled', info.today && 'day--today']
          ).filter(Boolean).join(' ');
          return (
            <button key={date} type="button" className={cls} aria-label={dayAriaLabel(date, info)} onClick={() => onOpenDay(date)}>
              {stage && <span className={`day__stage day__stage--${group}`}>{stage}</span>}
              {Number(date.slice(8))}
              {!filtered && info.intimacy && <i className="day__dot" aria-hidden="true" />}
              {!filtered && info.note && <b className="day__note" aria-hidden="true" />}
              {!filtered && info.tracked && <u className="day__track" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </>
  );
});
