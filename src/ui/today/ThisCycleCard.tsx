import { formatShort, type ISODate } from '../../domain/dates';
import { TRACKING, trackingDef } from '../../domain/tracking';
import type { NewEntry } from '../../domain/types';

interface Stat { value: number; label: string }

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Counts for the current cycle: intimacy days, then the most common tracked values, then notes. */
export function cycleStats(entries: readonly NewEntry[], lastStart: ISODate, today: ISODate) {
  const inCycle = entries.filter((e) => e.date >= lastStart && e.date <= today);
  const intimacy = new Set(inCycle.filter((e) => e.type === 'intimacy').map((e) => e.date)).size;
  const stats: Stat[] = [{ value: intimacy, label: plural(intimacy, 'Intimacy day', 'Intimacy days') }];

  const tracked: (Stat & { order: number })[] = [];
  TRACKING.forEach((def, order) => {
    const counts = new Map<string, number>();
    for (const e of inCycle) if (e.type === def.type && e.value) counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
    if (!counts.size) return;
    // Most common value; ties go to the option listed first
    const [value, n] = [...counts].sort((a, b) => b[1] - a[1] || def.options.findIndex((o) => o.value === a[0]) - def.options.findIndex((o) => o.value === b[0]))[0];
    const noun = trackingDef(def.type).noun;
    const label = def.type === 'pain' && value === 'none' ? plural(n, 'Pain-free day', 'Pain-free days') : `${capital(value)} ${noun} ${plural(n, 'day', 'days')}`;
    tracked.push({ value: n, label, order });
  });
  tracked.sort((a, b) => b.value - a.value || a.order - b.order);
  stats.push(...tracked.slice(0, 2).map(({ value, label }) => ({ value, label })));

  const notes = inCycle.filter((e) => e.type === 'note').length;
  if (stats.length < 3) stats.push({ value: notes, label: plural(notes, 'Note', 'Notes') });

  const latest = entries.filter((e) => e.type === 'note' && e.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return { stats, latestNote: latest ? { date: latest.date, text: latest.text ?? '' } : null };
}

export function ThisCycleCard({ entries, lastStart, today }: { entries: readonly NewEntry[]; lastStart: ISODate; today: ISODate }) {
  const { stats, latestNote } = cycleStats(entries, lastStart, today);
  return (
    <section className="this-cycle">
      <h2 className="today__section-title">This cycle so far</h2>
      <div className="card">
        <dl className="this-cycle__stats">
          {stats.map((s) => (
            <div key={s.label}>
              <dd>{s.value}</dd>
              <dt>{s.label}</dt>
            </div>
          ))}
        </dl>
        {latestNote && (
          <p className="this-cycle__note">
            <small>Latest note · {formatShort(latestNote.date)}</small>
            <span>{latestNote.text}</span>
          </p>
        )}
      </div>
    </section>
  );
}
