import { memo } from 'react';
import { MONTHS, type ISODate } from '../../domain/dates';
import { dayAriaLabel, dayInfo, filterCount, matchesFilter, monthCells, type CalendarFilter, type CalendarIndex, type MonthRef } from './monthModel';

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
          const cls = (filtered
            ? ['day', hit ? `day--hit day--hit-${filter}` : 'day--dim', info.today && 'day--today']
            : ['day', info.period && 'day--period', info.predicted && 'day--predicted', info.possible && 'day--possible', info.fertile && 'day--fertile', info.today && 'day--today']
          ).filter(Boolean).join(' ');
          return (
            <button key={date} type="button" className={cls} aria-label={dayAriaLabel(date, info)} onClick={() => onOpenDay(date)}>
              {Number(date.slice(8))}
              {!filtered && info.intimacy && <i className="day__dot" aria-hidden="true" />}
              {!filtered && info.note && <b className="day__note" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </>
  );
});
