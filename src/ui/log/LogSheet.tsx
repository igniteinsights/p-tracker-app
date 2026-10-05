import { useCallback, useEffect, useState } from 'react';
import { nearbyStartGap } from '../../domain/cycles';
import { addDays, diffDays, formatLong, type ISODate } from '../../domain/dates';
import type { Entry } from '../../domain/types';
import { repo, type DayDraft } from '../../data';
import { ensurePersisted } from '../../pwa/storage';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { saveErrorMessage } from '../common/errors';
import { Sheet } from '../common/Sheet';
import { useToast } from '../common/Toast';
import { Toggle } from '../common/Toggle';
import { ChevronLeft, ChevronRight } from '../icons';
import './log.css';

interface LogSheetProps {
  date: ISODate;
  entries: readonly Entry[];
  today: ISODate;
  focusNote: boolean;
  onClose: () => void;
  onChangeDate: (date: ISODate) => void;
}

type Pending = { kind: 'discard'; then: () => void } | { kind: 'soon'; gap: number; after: boolean };

export function LogSheet({ date, entries, today, focusNote, onClose, onChangeDate }: LogSheetProps) {
  const toast = useToast();
  const [orig, setOrig] = useState<DayDraft | null>(null);
  const [draft, setDraft] = useState<DayDraft | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const future = date > today;

  useEffect(() => {
    let live = true;
    void repo.getDay(date).then((d) => { if (live) { setOrig(d); setDraft(d); } });
    return () => { live = false; };
  }, [date]);

  const dirty = !!draft && !!orig && JSON.stringify(draft) !== JSON.stringify(orig);
  const guard = useCallback((then: () => void) => (dirty ? setPending({ kind: 'discard', then }) : then()), [dirty]);
  const requestClose = useCallback(() => guard(onClose), [guard, onClose]);
  const set = (patch: Partial<DayDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  async function save(skipCheck = false) {
    if (!draft || !orig) return;
    if (!skipCheck && draft.periodStart && !orig.periodStart) {
      const others = entries.filter((e) => e.type === 'period-start' && e.date !== date);
      const gap = nearbyStartGap(others, date);
      if (gap !== null) {
        const after = others.some((e) => Math.abs(diffDays(date, e.date)) === gap && e.date < date);
        setPending({ kind: 'soon', gap, after });
        return;
      }
    }
    try {
      await repo.saveDay(date, draft);
      void ensurePersisted();
      toast('Saved');
      onClose();
    } catch (err) {
      toast(saveErrorMessage(err));
    }
  }

  const withYear = date.slice(0, 4) !== today.slice(0, 4);

  return (
    <Sheet label={`Log ${formatLong(date, true)}`} onClose={requestClose}>
      <div className="log__head">
        <h2 className="log__title">{formatLong(date, withYear)}</h2>
        <div className="log__nav">
          <button type="button" aria-label="Previous day" onClick={() => guard(() => onChangeDate(addDays(date, -1)))}><ChevronLeft /></button>
          <button type="button" aria-label="Next day" onClick={() => guard(() => onChangeDate(addDays(date, 1)))}><ChevronRight /></button>
        </div>
      </div>
      {draft && (
        <>
          <Toggle label="Period started" checked={draft.periodStart} disabled={future && !orig?.periodStart} onChange={(v) => set({ periodStart: v })} />
          <Toggle label="Period ended" hint="Optional, otherwise estimated" checked={draft.periodEnd} disabled={future && !orig?.periodEnd} onChange={(v) => set({ periodEnd: v })} />
          <Toggle label="Intimacy" checked={draft.intimacy} disabled={future && !orig?.intimacy} onChange={(v) => set({ intimacy: v })} />
          <textarea
            className="textarea log__note"
            aria-label="Note"
            placeholder="Add a note"
            value={draft.note}
            autoFocus={focusNote}
            onChange={(e) => set({ note: e.target.value })}
          />
          <button type="button" className="btn btn--primary btn--block log__save" onClick={() => void save()}>Save</button>
        </>
      )}
      {pending?.kind === 'discard' && (
        <ConfirmDialog
          title="Discard changes?"
          body="Your changes to this day haven't been saved."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          destructive
          onCancel={() => setPending(null)}
          onConfirm={() => { const then = pending.then; setPending(null); then(); }}
        />
      )}
      {pending?.kind === 'soon' && (
        <ConfirmDialog
          title="Log another period start?"
          body={`This is ${pending.gap} days ${pending.after ? 'after' : 'before'} another period start. Log it anyway?`}
          confirmLabel="Log it"
          onCancel={() => setPending(null)}
          onConfirm={() => { setPending(null); void save(true); }}
        />
      )}
    </Sheet>
  );
}
