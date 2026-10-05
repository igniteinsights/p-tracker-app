import { formatDayMonth, formatShort } from '../../domain/dates';
import type { Prediction } from '../../domain/predict';
import { comingUp } from './comingUp';
import { rangeText } from './ribbonModel';

const days = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${n} days`);

function Row({ swatch, title, detail, aside }: { swatch: string; title: string; detail: string; aside?: string }) {
  return (
    <li className="upcoming__row">
      <span className={`upcoming__swatch upcoming__swatch--${swatch}`} aria-hidden="true" />
      <span className="upcoming__text">
        <span>{title}</span>
        <small>{detail}</small>
      </span>
      {aside && <span className="upcoming__aside">{aside}</span>}
    </li>
  );
}

export function ComingUpList({ prediction }: { prediction: Prediction }) {
  const { period, fertile, last } = comingUp(prediction);
  const lastYear = last.date.slice(0, 4) !== prediction.today.slice(0, 4) ? ` ${last.date.slice(0, 4)}` : '';
  return (
    <section className="upcoming" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title" className="today__section-title">{period ? 'Coming up' : 'Your cycle'}</h2>
      <ul className="upcoming__list">
        {period && period.late > 0 && (
          <Row swatch="period" title="Period late" detail={`Expected ${formatShort(period.date)}`} aside={`${period.late} ${period.late === 1 ? 'day' : 'days'} late`} />
        )}
        {period && period.late === 0 && (
          <Row
            swatch="period"
            title="Next period"
            detail={period.range ? `${formatShort(period.date)} · likely ${rangeText(period.range.earliest, period.range.latest)}` : formatShort(period.date)}
            aside={days(period.inDays)}
          />
        )}
        {fertile && (
          <Row
            swatch="fertile"
            title={fertile.now ? 'Fertile window' : 'Next fertile window'}
            detail={fertile.now ? `Until ${formatShort(fertile.end)}` : `${formatShort(fertile.start)} – ${formatShort(fertile.end)}`}
            aside={fertile.now ? 'Now' : days(fertile.inDays)}
          />
        )}
        <Row swatch="last" title="Last period" detail={`${formatDayMonth(last.date)}${lastYear} · ${last.length} days`} />
      </ul>
    </section>
  );
}
