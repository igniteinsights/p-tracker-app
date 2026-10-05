import { memo } from 'react';
import { MONTHS, type ISODate } from '../../domain/dates';
import { dayAriaLabel, dayInfo, monthCells, type CalendarIndex, type MonthRef } from './monthModel';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface MonthProps {
  month: MonthRef;
  index: CalendarIndex;
  today: ISODate;
  onOpenDay: (date: ISODate) => void;
}

export const Month = memo(function Month({ month, index, today, onOpenDay }: MonthProps) {
  return (
    <>
      <div className="month__head">
        <h2>{MONTHS[month.month - 1]}</h2>
        <span>{month.year}</span>
      </div>
      <div className="month__grid">
        {DOW.map((d, i) => <span key={i} className="month__dow" aria-hidden="true">{d}</span>)}
        {monthCells(month).map((date, i) => {
          if (!date) return <span key={`b${i}`} />;
          const info = dayInfo(date, index, today);
          const cls = ['day', info.period && 'day--period', info.predicted && 'day--predicted', info.fertile && 'day--fertile', info.today && 'day--today']
            .filter(Boolean).join(' ');
          return (
            <button key={date} type="button" className={cls} aria-label={dayAriaLabel(date, info)} onClick={() => onOpenDay(date)}>
              {Number(date.slice(8))}
              {info.intimacy && <i className="day__dot" aria-hidden="true" />}
              {info.note && <b className="day__note" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </>
  );
});
