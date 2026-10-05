import { useState } from 'react';
import { formatShort, isValidISODate, MONTHS, type ISODate } from '../../domain/dates';
import { repo } from '../../data';
import { ensurePersisted } from '../../pwa/storage';
import { saveErrorMessage } from '../common/errors';
import { useToast } from '../common/Toast';

/** Shown while history is old: the quickest way to get predictions (and the missing cards) back. */
export function CatchUpCard({ lastStart, today }: { lastStart: ISODate; today: ISODate }) {
  const toast = useToast();
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState('');
  const endedIn = `${MONTHS[Number(lastStart.slice(5, 7)) - 1]} ${lastStart.slice(0, 4)}`;
  const valid = isValidISODate(date) && date <= today && date > lastStart;

  async function log(d: ISODate) {
    try {
      await repo.setEntry(d, 'period-start', true);
      void ensurePersisted();
      toast(`Period start logged for ${formatShort(d)}`, {
        label: 'Undo',
        run: () => { void repo.setEntry(d, 'period-start', false); },
      });
    } catch (err) {
      toast(saveErrorMessage(err));
    }
  }

  return (
    <section className="card catchup" aria-labelledby="catchup-title">
      <h2 id="catchup-title" className="card__title">When did your most recent period start?</h2>
      <p className="card__text">Your history ends in {endedIn}. Logging the latest start brings back predictions, the ribbon and your cycle stages.</p>
      {picking ? (
        <div className="catchup__pick">
          <label className="catchup__label">
            Start date
            <input className="input" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button type="button" className="btn btn--primary" disabled={!valid} onClick={() => void log(date)}>Log it</button>
        </div>
      ) : (
        <div className="catchup__actions">
          <button type="button" className="btn btn--accent" onClick={() => setPicking(true)}>Pick the date</button>
          <button type="button" className="btn btn--quiet" onClick={() => void log(today)}>It started today</button>
        </div>
      )}
    </section>
  );
}
