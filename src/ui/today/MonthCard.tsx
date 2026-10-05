import { useMemo } from 'react';
import { MONTHS, type ISODate } from '../../domain/dates';
import type { Prediction } from '../../domain/predict';
import type { NewEntry, Settings } from '../../domain/types';
import { buildCalendarIndex, dayInfo, monthCells } from '../calendar/monthModel';

interface MonthCardProps {
  entries: readonly NewEntry[];
  prediction: Prediction | null;
  settings: Settings;
  today: ISODate;
  onOpenCalendar: () => void;
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** A small version of this month's calendar, with the same stage colours. */
export function MonthCard({ entries, prediction, settings, today, onOpenCalendar }: MonthCardProps) {
  const index = useMemo(() => buildCalendarIndex(entries, prediction, settings, today), [entries, prediction, settings, today]);
  const month = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const name = `${MONTHS[month.month - 1]} ${month.year}`;

  return (
    <section className="month-card">
      <h2 className="today__section-title">
        <span>This month</span>
        <span aria-hidden="true">Calendar ›</span>
      </h2>
      <button type="button" className="mini" aria-label={`This month: ${name}. Open calendar.`} onClick={onOpenCalendar}>
        {DOW.map((d, i) => <span key={`d${i}`} className="mini__dow" aria-hidden="true">{d}</span>)}
        {monthCells(month).map((date, i) => {
          if (!date) return <span key={`b${i}`} aria-hidden="true" />;
          const info = dayInfo(date, index, today);
          const cls = ['mini__day', info.phase && `mini__day--${info.phase}`, info.future && 'mini__day--future',
            info.period && 'mini__day--period', info.predicted && 'mini__day--predicted', info.today && 'mini__day--today']
            .filter(Boolean).join(' ');
          return <span key={date} className={cls} aria-hidden="true">{Number(date.slice(8))}</span>;
        })}
      </button>
    </section>
  );
}
