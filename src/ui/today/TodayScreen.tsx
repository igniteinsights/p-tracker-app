import { useMemo } from 'react';
import { formatLong, type ISODate } from '../../domain/dates';
import { buildCalendarIndex, type Phase } from '../calendar/monthModel';
import type { DataState } from '../../data/useData';
import { ComingUpList } from './ComingUpList';
import { RecentCycles } from './RecentCycles';
import { QuickLog } from './QuickLog';
import { Ribbon } from './Ribbon';
import { statusLine } from './ribbonModel';
import './today.css';

const STAGE_COPY: Record<Phase, [string, string]> = {
  period: ['Period', 'bleeding days'],
  follicular: ['Follicular phase', 'after your period, before the fertile window'],
  fertile: ['Fertile window', 'most likely days to conceive'],
  ovulation: ['Estimated ovulation', 'the most fertile day'],
  luteal: ['Luteal phase', 'after ovulation, until your next period'],
};

interface TodayScreenProps {
  data: DataState;
  onOpenCalendar: () => void;
  onOpenLog: (date: ISODate, focusNote?: boolean) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export function TodayScreen({ data, onOpenCalendar, onOpenLog, onOpenSettings, onOpenHistory }: TodayScreenProps) {
  const { prediction: p, today, entries, settings } = data;
  // Same stage calculation as the calendar shading, so the two always agree
  const stage = useMemo(
    () => (p && !p.stale && !p.irregular ? buildCalendarIndex(entries, p, settings, today).phase.get(today) ?? null : null),
    [entries, p, settings, today],
  );
  const quickLog = <div className="dock"><QuickLog entries={entries} today={today} onNote={() => onOpenLog(today, true)} /></div>;

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
      {stage && (
        <p className="today__stage">
          <em className={`today__stage-swatch today__stage-swatch--${stage}`} aria-hidden="true" />
          <strong>{STAGE_COPY[stage][0]}</strong>
          <span>{STAGE_COPY[stage][1]}</span>
        </p>
      )}
      {p.stale && <p className="today__hint">Log the first day of your most recent period to start predictions again.</p>}
      {!p.stale && !p.irregular && <Ribbon prediction={p} onOpen={onOpenCalendar} />}
      <ComingUpList prediction={p} />
      <RecentCycles entries={entries} settings={settings} today={today} onOpenHistory={onOpenHistory} />
      {quickLog}
    </section>
  );
}
