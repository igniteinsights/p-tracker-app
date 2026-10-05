import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ISODate } from '../../domain/dates';
import type { DataState } from '../../data/useData';
import { Month } from './Month';
import { buildCalendarIndex, monthKey, monthRange, type CalendarFilter } from './monthModel';
import './calendar.css';

function Lazy({ children, eager }: { children: ReactNode; eager: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { rootMargin: '800px 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);
  return <div ref={ref} className="month">{visible ? children : <div className="month__placeholder" />}</div>;
}

const FILTERS: [CalendarFilter, string][] = [['all', 'All'], ['period', 'Period'], ['intimacy', 'Intimacy'], ['notes', 'Notes']];

export function CalendarScreen({ data, onOpenLog }: { data: DataState; onOpenLog: (date: ISODate) => void }) {
  const { entries, prediction, settings, today } = data;
  const months = useMemo(() => monthRange(entries, today), [entries, today]);
  const index = useMemo(() => buildCalendarIndex(entries, prediction, settings, today), [entries, prediction, settings, today]);
  const currentKey = today.slice(0, 7);
  const currentRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<CalendarFilter>('all');

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'start' });
  }, []);

  return (
    <section className="calendar">
      <div className="cal-filter" role="group" aria-label="Show">
        {FILTERS.map(([value, label]) => (
          <button key={value} type="button" className={`cal-filter__chip cal-filter__chip--${value}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      {months.map((m) => {
        const key = monthKey(m);
        const near = Math.abs(m.year * 12 + m.month - (Number(currentKey.slice(0, 4)) * 12 + Number(currentKey.slice(5)))) <= 3;
        return (
          <div key={key} ref={key === currentKey ? currentRef : undefined} className="calendar__anchor">
            <Lazy eager={near}>
              <Month month={m} index={index} today={today} filter={filter} onOpenDay={onOpenLog} />
            </Lazy>
          </div>
        );
      })}
      <dl className="stages">
        <div><dt><em className="legend__swatch legend__swatch--period" />Period</dt><dd>Bleeding days</dd></div>
        <div><dt><em className="legend__swatch legend__swatch--follicular" />Follicular</dt><dd>After your period, before the fertile window</dd></div>
        <div><dt><em className="legend__swatch legend__swatch--fertile" />Fertile</dt><dd>Most likely days to conceive, darkest at estimated ovulation</dd></div>
        <div><dt><em className="legend__swatch legend__swatch--luteal" />Luteal</dt><dd>After ovulation, until your next period</dd></div>
      </dl>
      <div className="legend" aria-hidden="true">
        <span><em className="legend__swatch legend__swatch--predicted" />Predicted period</span>
        <span><em className="legend__swatch legend__swatch--possible" />Possible start</span>
        <span><em className="legend__dot" />Intimacy</span>
        <span><em className="legend__note" />Note</span>
        <span><em className="legend__track" />Extra tracking</span>
        <span>Paler days are predictions</span>
      </div>
    </section>
  );
}
