import { useEffect, useState } from 'react';
import { repo, type Meta } from '../../data';
import { verifyPin } from '../../pwa/pin';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';
import { Keypad } from './Keypad';
import './lock.css';

const MAX_TRIES = 5;
const COOLDOWN_MS = 30_000;
const STORE_KEY = 'p-tracker-lock';

// Kept across reloads so reloading doesn't skip the pause
function readAttempts(): { tries: number; until: number } {
  try {
    return { tries: 0, until: 0, ...JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') };
  } catch {
    return { tries: 0, until: 0 };
  }
}
function writeAttempts(a: { tries: number; until: number }) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(a)); } catch { /* storage unavailable */ }
}

export function LockScreen({ meta, onUnlock }: { meta: Meta; onUnlock: () => void }) {
  const toast = useToast();
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(readAttempts);
  const [now, setNow] = useState(Date.now());
  const [checking, setChecking] = useState(false);
  const [forgot, setForgot] = useState(false);
  const length = meta.pinLength ?? 4;
  const waiting = attempts.until > now;

  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [waiting]);

  async function check(pin: string) {
    if (!meta.pinHash || !meta.pinSalt) return onUnlock();
    setChecking(true);
    const ok = await verifyPin(pin, { hash: meta.pinHash, salt: meta.pinSalt });
    setChecking(false);
    setEntry('');
    if (ok) {
      writeAttempts({ tries: 0, until: 0 });
      onUnlock();
      return;
    }
    const tries = attempts.tries + 1;
    const next = tries >= MAX_TRIES ? { tries: 0, until: Date.now() + COOLDOWN_MS } : { tries, until: 0 };
    setAttempts(next);
    writeAttempts(next);
    setNow(Date.now());
    setError(tries >= MAX_TRIES ? 'Wrong PIN.' : `Wrong PIN. ${MAX_TRIES - tries} ${MAX_TRIES - tries === 1 ? 'try' : 'tries'} left before a pause.`);
  }

  function onDigit(d: string) {
    if (waiting || checking) return;
    const next = (entry + d).slice(0, length);
    setEntry(next);
    setError(null);
    if (next.length === length) void check(next);
  }

  async function erase() {
    await repo.deleteAll();
    await repo.setMeta({ pinHash: null, pinSalt: null, pinLength: null });
    writeAttempts({ tries: 0, until: 0 });
    toast('Everything erased. Restore a backup from Settings.');
    onUnlock();
  }

  const secondsLeft = Math.ceil((attempts.until - now) / 1000);

  return (
    <main className="lock">
      <h1 className="lock__title">p-tracker is locked</h1>
      <p className="lock__hint">Enter your PIN</p>
      <Keypad
        value={entry}
        dots={length}
        disabled={waiting || checking}
        onDigit={onDigit}
        onDelete={() => setEntry((e) => e.slice(0, -1))}
        extra={<button type="button" className="lock__forgot" onClick={() => setForgot(true)}>Forgot PIN?</button>}
      />
      <p className="lock__error" role="alert">
        {error}
        {waiting && <span> Try again in {secondsLeft} seconds.</span>}
      </p>
      {forgot && (
        <ConfirmDialog
          title="Erase everything?"
          body="Your PIN can't be recovered. Erasing deletes every entry and setting on this phone and turns the PIN off. You can then restore a backup file from Settings."
          requireText="erase"
          confirmLabel="Erase everything"
          destructive
          onCancel={() => setForgot(false)}
          onConfirm={() => { setForgot(false); void erase(); }}
        />
      )}
    </main>
  );
}
