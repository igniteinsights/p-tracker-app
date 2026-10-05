import { useState } from 'react';
import { nearbyStartGap } from '../../domain/cycles';
import type { ISODate } from '../../domain/dates';
import type { Entry, FlagType } from '../../domain/types';
import { repo } from '../../data';
import { ensurePersisted } from '../../pwa/storage';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { saveErrorMessage } from '../common/errors';
import { useToast } from '../common/Toast';

interface QuickLogProps {
  entries: readonly Entry[];
  today: ISODate;
  onNote: () => void;
}

const LABELS: Record<Exclude<FlagType, 'period-end'>, string> = {
  'period-start': 'Period start',
  intimacy: 'Intimacy',
};

export function QuickLog({ entries, today, onNote }: QuickLogProps) {
  const toast = useToast();
  const [gap, setGap] = useState<number | null>(null);
  const has = (type: FlagType) => entries.some((e) => e.date === today && e.type === type);

  async function toggle(type: Exclude<FlagType, 'period-end'>) {
    const before = has(type);
    try {
      const result = await repo.toggleEntry(today, type);
      toast(`${LABELS[type]} ${result === 'added' ? 'logged' : 'removed'}`, {
        label: 'Undo',
        run: () => { repo.setEntry(today, type, before).catch((err) => toast(saveErrorMessage(err))); },
      });
      if (result === 'added') void ensurePersisted();
    } catch (err) {
      toast(saveErrorMessage(err));
    }
  }

  function onPeriod() {
    if (!has('period-start')) {
      const g = nearbyStartGap(entries.filter((e) => e.date <= today), today);
      if (g !== null) { setGap(g); return; }
    }
    void toggle('period-start');
  }

  return (
    <div className="chips">
      <button type="button" className={`chip chip--primary${has('period-start') ? ' chip--on' : ''}`} aria-pressed={has('period-start')} onClick={onPeriod}>
        Period started
      </button>
      <button type="button" className={`chip${has('intimacy') ? ' chip--on' : ''}`} aria-pressed={has('intimacy')} onClick={() => void toggle('intimacy')}>
        Intimacy
      </button>
      <button type="button" className="chip" onClick={onNote}>Note</button>
      {gap !== null && (
        <ConfirmDialog
          title="Log another period start?"
          body={`This is ${gap} days after the last period start. Log it anyway?`}
          confirmLabel="Log it"
          onCancel={() => setGap(null)}
          onConfirm={() => { setGap(null); void toggle('period-start'); }}
        />
      )}
    </div>
  );
}
