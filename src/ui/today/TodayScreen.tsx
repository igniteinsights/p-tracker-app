import { formatLong, type ISODate } from '../../domain/dates';
import type { DataState } from '../../data/useData';
import { FactGrid } from './FactGrid';
import { QuickLog } from './QuickLog';
import { Ribbon } from './Ribbon';
import { statusLine } from './ribbonModel';
import './today.css';

interface TodayScreenProps {
  data: DataState;
  onOpenCalendar: () => void;
  onOpenLog: (date: ISODate, focusNote?: boolean) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export function TodayScreen({ data, onOpenCalendar, onOpenLog, onOpenSettings, onOpenHistory }: TodayScreenProps) {
  const { prediction: p, today, entries } = data;
  const quickLog = <QuickLog entries={entries} today={today} onNote={() => onOpenLog(today, true)} />;

  if (!p) {
    return (
      <section className="today">
        <p className="today__date">{formatLong(today)}</p>
        <h1 className="today__empty-title">Start your history</h1>
        <p className="today__status">Log the first day of your last period, or bring in your MyDays history.</p>
        {quickLog}
        <button type="button" className="btn btn--quiet today__import" onClick={onOpenSettings}>Import from MyDays</button>
      </section>
    );
  }

  return (
    <section className="today">
      <p className="today__date">{formatLong(today)}</p>
      {p.stale ? (
        <h1 className="today__empty-title">Welcome back</h1>
      ) : (
        <h1 className="today__day">
          {p.cycleDay}
          <small>{p.irregular ? ' cycle day' : ` of ${p.avgCycle}`}</small>
          <span className="visually-hidden"> days into this cycle</span>
        </h1>
      )}
      <p className="today__status">{statusLine(p)}</p>
      {p.stale && <p className="today__hint">Log the first day of your most recent period to start predictions again.</p>}
      {!p.stale && !p.irregular && <Ribbon prediction={p} onOpen={onOpenCalendar} />}
      <FactGrid prediction={p} onOpenHistory={onOpenHistory} />
      {quickLog}
    </section>
  );
}
