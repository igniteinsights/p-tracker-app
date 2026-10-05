import { useState } from 'react';
import { buildCycles } from '../../domain/cycles';
import { averageCycleLength, averagePeriodLength } from '../../domain/predict';
import { CYCLE_RANGE, DEFAULT_SETTINGS, PERIOD_RANGE, type LengthSetting, type Settings } from '../../domain/types';
import { exportFilename, serializeBackup } from '../../io/backup';
import { toCsv } from '../../io/csv';
import { deliverFile } from '../../io/share';
import { repo } from '../../data';
import type { DataState } from '../../data/useData';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Toggle } from '../common/Toggle';
import { useToast } from '../common/Toast';
import { backupNudge } from './backupNudge';
import { ImportFlow } from './ImportFlow';
import { PrivacySection } from './PrivacySection';
import { TRACKING } from '../../domain/tracking';
import { getThemePref, setThemePref, type ThemePref } from '../theme';
import './settings.css';

function range(min: number, max: number) {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

interface LengthRowProps {
  label: string;
  setting: LengthSetting;
  autoValue: number;
  min: number;
  max: number;
  onChange: (s: LengthSetting) => void;
}

function LengthRow({ label, setting, autoValue, min, max, onChange }: LengthRowProps) {
  const id = `len-${label.replace(/\s/g, '-').toLowerCase()}`;
  return (
    <div className="list__item">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="settings__select"
        value={setting.mode === 'auto' ? 'auto' : String(setting.value)}
        onChange={(e) => onChange(e.target.value === 'auto' ? { mode: 'auto', value: setting.value } : { mode: 'fixed', value: Number(e.target.value) })}
      >
        <option value="auto">Auto, {autoValue} days</option>
        {range(min, max).map((n) => <option key={n} value={n}>{n} days</option>)}
      </select>
    </div>
  );
}

export function SettingsScreen({ data, onOpenHistory }: { data: DataState; onOpenHistory: () => void }) {
  const toast = useToast();
  const { entries, settings, meta, today } = data;
  const [importing, setImporting] = useState(false);
  const [theme, setTheme] = useState<ThemePref>(getThemePref);
  const [deleting, setDeleting] = useState(false);
  const hasData = entries.length > 0;
  const nudge = backupNudge(meta, hasData);

  const cycles = buildCycles(entries, today);
  const autoCycle = averageCycleLength(cycles, DEFAULT_SETTINGS);
  const autoPeriod = averagePeriodLength(cycles, DEFAULT_SETTINGS);

  async function exportJson() {
    const r = await deliverFile(exportFilename('json', today), 'application/json', serializeBackup(entries, settings));
    if (r === 'cancelled') return;
    await repo.setMeta({ lastBackupAt: new Date().toISOString() });
    toast('Backup exported');
  }

  async function exportCsv() {
    const r = await deliverFile(exportFilename('csv', today), 'text/csv', toCsv(entries));
    if (r !== 'cancelled') toast('CSV exported');
  }

  const update = (patch: Partial<Settings>) => void repo.setSettings({ ...settings, ...patch });

  return (
    <section>
      <h1 className="screen__title">Settings</h1>
      {nudge && <p className="settings__nudge">{nudge}</p>}

      <div className="group">
        <h2 className="group__title">Your data</h2>
        <div className="list">
          <button type="button" className="list__item" disabled={!hasData} onClick={() => void exportJson()}>
            <span>Export backup<small>JSON file, can be imported back</small></span>
          </button>
          <button type="button" className="list__item" disabled={!hasData} onClick={() => void exportCsv()}>
            <span>Export for spreadsheets<small>CSV file, opens in Google Sheets or Excel</small></span>
          </button>
          <button type="button" className="list__item" onClick={() => setImporting(true)}>
            <span>Import backup<small>JSON from this app</small></span>
          </button>
          <button type="button" className="list__item" onClick={() => setImporting(true)}>
            <span>Import from MyDays<small>.myd file</small></span>
          </button>
        </div>
      </div>

      <div className="group">
        <h2 className="group__title">Predictions</h2>
        <div className="list">
          <LengthRow label="Cycle length" setting={settings.cycleLength} autoValue={autoCycle} min={CYCLE_RANGE.min} max={CYCLE_RANGE.max} onChange={(cycleLength) => update({ cycleLength })} />
          <LengthRow label="Period length" setting={settings.periodLength} autoValue={autoPeriod} min={PERIOD_RANGE.min} max={PERIOD_RANGE.max} onChange={(periodLength) => update({ periodLength })} />
          <Toggle label="Irregular cycles" hint="Turns off predictions and shows only what you've logged" checked={settings.irregular} onChange={(irregular) => update({ irregular })} />
          <button type="button" className="list__item" onClick={onOpenHistory}>
            <span>Cycle history<small>See every cycle and choose which ones count</small></span>
            <span className="list__value" aria-hidden="true">›</span>
          </button>
        </div>
      </div>

      <div className="group">
        <h2 className="group__title">Appearance</h2>
        <div className="list">
          <div className="list__item">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              className="settings__select"
              value={theme}
              onChange={(e) => { const pref = e.target.value as ThemePref; setTheme(pref); setThemePref(pref); }}
            >
              <option value="system">Match phone</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>

      <div className="group">
        <h2 className="group__title">Extra tracking</h2>
        <div className="list">
          {TRACKING.map((t) => (
            <Toggle
              key={t.type}
              label={t.type === 'flow' ? 'Flow level' : t.type === 'pain' ? 'Pain / cramps' : t.label}
              hint={t.options.map((o) => o.label).join(', ')}
              checked={settings.tracking.includes(t.type)}
              onChange={(on) => update({ tracking: on ? [...settings.tracking, t.type] : settings.tracking.filter((x) => x !== t.type) })}
            />
          ))}
        </div>
        <p className="settings__disclaimer">Switched-on types appear when you log a day.</p>
      </div>

      <PrivacySection meta={meta} hasData={hasData} onExport={() => void exportJson()} onDeleteAll={() => setDeleting(true)} />

      <div className="group">
        <h2 className="group__title">About</h2>
        <div className="list">
          <div className="list__item"><span>Version</span><span className="list__value">{__APP_VERSION__}</span></div>
          <div className="list__item"><span>Storage</span><span className="list__value">This phone only</span></div>
        </div>
        <p className="settings__disclaimer">Predictions are estimates based on your past cycles. They are not a reliable form of contraception.</p>
      </div>


      {importing && <ImportFlow hasData={hasData} onClose={() => setImporting(false)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete all data?"
          body="This removes every entry and setting from this phone. It can't be undone. Export a backup first if you might want them back."
          secondary={{ label: 'Export backup first', run: () => void exportJson() }}
          requireText="delete"
          confirmLabel="Delete everything"
          destructive
          onCancel={() => setDeleting(false)}
          onConfirm={() => { setDeleting(false); void repo.deleteAll().then(() => toast('All data deleted')); }}
        />
      )}
    </section>
  );
}
