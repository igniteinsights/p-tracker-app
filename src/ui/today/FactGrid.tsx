import { formatDayMonth } from '../../domain/dates';
import type { Prediction } from '../../domain/predict';
import { fertileStatus } from './ribbonModel';

export function FactGrid({ prediction }: { prediction: Prediction }) {
  const sameYear = prediction.lastStart.slice(0, 4) === prediction.today.slice(0, 4);
  const lastDate = sameYear ? formatDayMonth(prediction.lastStart) : `${formatDayMonth(prediction.lastStart)} ${prediction.lastStart.slice(0, 4)}`;
  const facts: [string, string][] = [
    ['Last period', `${lastDate}, ${prediction.lastPeriodLength} days`],
    ['Average cycle', `${prediction.avgCycle} days`],
    ['Fertile window', prediction.stale ? 'Not enough recent data' : fertileStatus(prediction)],
    ['Cycles logged', String(prediction.cyclesLogged)],
  ];
  return (
    <dl className="facts">
      {facts.map(([label, value]) => (
        <div key={label} className="facts__cell">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
