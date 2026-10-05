import { useEffect, useState } from 'react';
import { formatDayMonth, todayISO } from '../../domain/dates';
import { repo, type Meta } from '../../data';
import { hashPin, type LockAfter } from '../../pwa/pin';
import { Toggle } from '../common/Toggle';
import { useToast } from '../common/Toast';
import { PinSheet } from '../lock/PinSheet';

interface PrivacySectionProps {
  meta: Meta;
  hasData: boolean;
  onExport: () => void;
  onDeleteAll: () => void;
}

type Flow = null | 'setup' | 'turn-off' | 'change-verify' | 'change-setup';

function backupDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = todayISO(new Date(iso));
  return `${formatDayMonth(d)} ${d.slice(0, 4)}`;
}

export function PrivacySection({ meta, hasData, onExport, onDeleteAll }: PrivacySectionProps) {
  const toast = useToast();
  const [flow, setFlow] = useState<Flow>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const pinOn = meta.pinHash !== null;

  useEffect(() => {
    let live = true;
    navigator.storage?.persisted?.().then((p) => { if (live) setPersisted(p); }).catch(() => {});
    return () => { live = false; };
  }, []);

  async function savePin(pin: string, message: string) {
    const { hash, salt } = await hashPin(pin);
    await repo.setMeta({ pinHash: hash, pinSalt: salt, pinLength: pin.length });
    setFlow(null);
    toast(message);
  }

  async function turnOff() {
    await repo.setMeta({ pinHash: null, pinSalt: null, pinLength: null });
    setFlow(null);
    toast('PIN lock turned off');
  }

  const storage = persisted ?? meta.storagePersisted;

  return (
    <div className="group">
      <h2 className="group__title">Privacy</h2>
      <p className="privacy__statement">
        Your data is stored only on this phone, inside this app. There's no account, no analytics and no ads, and nothing is sent anywhere.
      </p>
      <div className="list">
        <div className="list__item">
          <span>Storage<small>{storage ? 'Protected from automatic clean-up' : 'Your browser may clear this data if the phone runs low on space'}</small></span>
        </div>
        <button type="button" className="list__item" disabled={!hasData} onClick={onExport}>
          <span>Last backup<small>Tap to export a backup now</small></span>
          <span className="list__value">{backupDate(meta.lastBackupAt)}</span>
        </button>
        <Toggle
          label="PIN lock"
          hint="Ask for a PIN when the app opens"
          checked={pinOn}
          onChange={(on) => setFlow(on ? 'setup' : 'turn-off')}
        />
        {pinOn && (
          <>
            <div className="list__item">
              <label htmlFor="lock-after">Lock after</label>
              <select
                id="lock-after"
                className="settings__select"
                value={meta.lockAfter}
                onChange={(e) => void repo.setMeta({ lockAfter: e.target.value as LockAfter })}
              >
                <option value="immediate">Immediately</option>
                <option value="1m">After 1 minute away</option>
                <option value="5m">After 5 minutes away</option>
              </select>
            </div>
            <button type="button" className="list__item" onClick={() => setFlow('change-verify')}>
              <span>Change PIN</span>
              <span className="list__value" aria-hidden="true">›</span>
            </button>
          </>
        )}
        <button type="button" className="list__item privacy__delete" disabled={!hasData} onClick={onDeleteAll}>
          <span>Delete all data<small>Removes every entry and setting from this phone</small></span>
        </button>
      </div>
      <p className="settings__disclaimer">
        The PIN hides the app from anyone who picks up your phone. It doesn't encrypt your data, so keep your phone's own screen lock on too. A forgotten PIN can't be recovered; you'd erase the app and restore a backup.
      </p>

      {flow === 'setup' && (
        <PinSheet mode="setup" title="Set a PIN" confirmLabel="Turn on PIN lock" onDone={(pin) => void savePin(pin, 'PIN lock turned on')} onClose={() => setFlow(null)} />
      )}
      {flow === 'turn-off' && (
        <PinSheet mode="verify" title="Turn off PIN lock" meta={meta} onDone={() => void turnOff()} onClose={() => setFlow(null)} />
      )}
      {flow === 'change-verify' && (
        <PinSheet mode="verify" title="Change PIN" meta={meta} onDone={() => setFlow('change-setup')} onClose={() => setFlow(null)} />
      )}
      {flow === 'change-setup' && (
        <PinSheet mode="setup" title="Choose a new PIN" confirmLabel="Save new PIN" onDone={(pin) => void savePin(pin, 'PIN changed')} onClose={() => setFlow(null)} />
      )}
    </div>
  );
}
