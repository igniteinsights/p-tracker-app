import { formatDayMonth } from '../../domain/dates';
import type { Prediction } from '../../domain/predict';
import { fertileStatus } from './ribbonModel';

interface FactGridProps {
  prediction: Prediction;
  onOpenHistory?: () => void;
}

export function FactGrid({ prediction: p, onOpenHistory }: FactGridProps) {
  const sameYear = p.lastStart.slice(0, 4) === p.today.slice(0, 4);
  const lastDate = sameYear ? formatDayMonth(p.lastStart) : `${formatDayMonth(p.lastStart)} ${p.lastStart.slice(0, 4)}`;
  const average = p.range ? `${p.avgCycle} days · ${p.range.low}–${p.range.high}` : `${p.avgCycle} days`;
  const fertile = p.irregular ? 'Off' : p.stale ? 'Not enough recent data' : fertileStatus(p);
  const facts: { label: string; value: string; opensHistory?: boolean }[] = [
    { label: 'Last period', value: `${lastDate}, ${p.lastPeriodLength} days` },
    { label: 'Average cycle', value: average, opensHistory: true },
    { label: 'Fertile window', value: fertile },
    { label: 'Cycles logged', value: String(p.cyclesLogged), opensHistory: true },
  ];
  return (
    <div className="facts">
      {facts.map(({ label, value, opensHistory }) => {
        const body = (
          <>
            <span className="facts__label">{label}</span>
            <span className="facts__value">{value}</span>
          </>
        );
        return opensHistory && onOpenHistory ? (
          <button key={label} type="button" className="facts__cell facts__cell--link" onClick={onOpenHistory}>{body}</button>
        ) : (
          <div key={label} className="facts__cell">{body}</div>
        );
      })}
    </div>
  );
}
