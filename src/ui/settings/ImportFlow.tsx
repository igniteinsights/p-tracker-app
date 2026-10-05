import { useRef, useState } from 'react';
import { formatMonthYear, todayISO } from '../../domain/dates';
import type { NewEntry, Settings } from '../../domain/types';
import { detectAndParse, summarise } from '../../io/importFile';
import type { ParseWarning } from '../../io/myd';
import { repo } from '../../data';
import { ensurePersisted } from '../../pwa/storage';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Sheet } from '../common/Sheet';
import { useToast } from '../common/Toast';

interface Preview {
  fileName: string;
  entries: NewEntry[];
  settings: Settings | null;
  warnings: ParseWarning[];
  newCount: number;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function ImportFlow({ hasData, onClose }: { hasData: boolean; onClose: () => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [useSettings, setUseSettings] = useState(!hasData);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const r = detectAndParse(file.name, await file.text());
    if (!r.ok) { setError(r.error); setPreview(null); return; }
    setPreview({ fileName: file.name, entries: r.entries, settings: r.settings, warnings: r.warnings, newCount: await repo.countNew(r.entries) });
  }

  async function run(mode: 'merge' | 'replace') {
    if (!preview) return;
    setBusy(true);
    try {
      const result = await repo.importEntries(preview.entries, mode, useSettings ? preview.settings : null);
      void ensurePersisted();
      toast(`Imported ${plural(result.added + result.notesAppended, 'entry', 'entries')}`);
      onClose();
    } catch {
      setBusy(false);
      setError("Couldn't import. Nothing was changed.");
    }
  }

  const s = preview && summarise(preview.entries);
  const today = todayISO();
  const futureCount = preview ? preview.entries.filter((e) => e.date > today).length : 0;

  return (
    <Sheet label="Import" onClose={onClose}>
      <h2 className="sheet-title">Import</h2>
      <input ref={input} className="visually-hidden" type="file" aria-label="Choose a file" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; void onFile(file); }} />
      {!preview && (
        <>
          <p className="sheet-text">Choose a .myd file exported from MyDays, or a .json backup from p-tracker. You'll see what's in it before anything is saved.</p>
          <button type="button" className="btn btn--primary btn--block" onClick={() => input.current?.click()}>Choose file</button>
        </>
      )}
      {error && <p className="sheet-error" role="alert">{error}</p>}
      {preview && s && (
        <>
          <p className="import__file">{preview.fileName}</p>
          <dl className="import__summary">
            <dt>Contains</dt>
            <dd>
              {[
                plural(s.counts['period-start'], 'period start'),
                plural(s.counts['period-end'], 'period end'),
                `${s.counts.intimacy} intimacy`,
                plural(s.counts.note, 'note'),
              ].join(', ')}
            </dd>
            <dt>Dates</dt>
            <dd>{s.first && s.last ? `${formatMonthYear(s.first)} – ${formatMonthYear(s.last)}` : 'None'}</dd>
            <dt>Compared with this phone</dt>
            <dd>{plural(preview.newCount, 'new entry', 'new entries')}</dd>
          </dl>
          {futureCount > 0 && (
            <p className="sheet-error" role="note">
              {futureCount === 1 ? '1 entry is' : `${futureCount} entries are`} dated after today. Check the file if that looks wrong; you can remove them later from the calendar.
            </p>
          )}
          {preview.warnings.length > 0 && (
            <details className="import__warnings">
              <summary>{plural(preview.warnings.length, "line couldn't", "lines couldn't")} be read exactly</summary>
              <ul>{preview.warnings.slice(0, 20).map((w, i) => <li key={i}>Line {w.line}: {w.message}</li>)}</ul>
            </details>
          )}
          {preview.settings && (
            <label className="import__check">
              <input type="checkbox" checked={useSettings} onChange={(e) => setUseSettings(e.target.checked)} />
              Use settings from this file (cycle {preview.settings.cycleLength.value} days, period {preview.settings.periodLength.value} days)
            </label>
          )}
          <div className="import__actions">
            <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={() => void run('merge')}>Merge</button>
            <button type="button" className="btn btn--quiet btn--block" disabled={busy || preview.entries.length === 0} onClick={() => setConfirmReplace(true)}>Replace everything</button>
          </div>
          <p className="sheet-text sheet-text--small">Merge adds only what this phone doesn't already have. Replace deletes everything here first.</p>
        </>
      )}
      {confirmReplace && (
        <ConfirmDialog
          title="Replace all your data?"
          body="Everything currently on this phone will be deleted and replaced with this file."
          confirmLabel="Replace"
          destructive
          onCancel={() => setConfirmReplace(false)}
          onConfirm={() => { setConfirmReplace(false); void run('replace'); }}
        />
      )}
    </Sheet>
  );
}
