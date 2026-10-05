import { useState } from 'react';
import type { Meta } from '../../data';
import { isValidPin, verifyPin } from '../../pwa/pin';
import { Sheet } from '../common/Sheet';
import { Keypad } from './Keypad';
import './lock.css';

type PinSheetProps =
  | { mode: 'setup'; title: string; confirmLabel: string; onDone: (pin: string) => void; onClose: () => void }
  | { mode: 'verify'; title: string; meta: Meta; onDone: () => void; onClose: () => void };

export function PinSheet(props: PinSheetProps) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState('');
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const verifyLength = props.mode === 'verify' ? props.meta.pinLength ?? 4 : 6;

  async function verify(pin: string) {
    if (props.mode !== 'verify') return;
    const { pinHash, pinSalt } = props.meta;
    setChecking(true);
    const ok = !!pinHash && !!pinSalt && (await verifyPin(pin, { hash: pinHash, salt: pinSalt }));
    setChecking(false);
    setEntry('');
    if (ok) props.onDone();
    else setError('Wrong PIN.');
  }

  function onDigit(d: string) {
    if (checking) return;
    const next = (entry + d).slice(0, verifyLength);
    setEntry(next);
    setError(null);
    if (props.mode === 'verify' && next.length === verifyLength) void verify(next);
  }

  function next() {
    if (props.mode !== 'setup') return;
    if (step === 'enter') {
      setFirst(entry);
      setEntry('');
      setStep('confirm');
    } else if (entry === first) {
      props.onDone(entry);
    } else {
      setError("The PINs don't match. Try again.");
      setFirst('');
      setEntry('');
      setStep('enter');
    }
  }

  const prompt = props.mode === 'verify' ? 'Enter your current PIN' : step === 'enter' ? 'Choose a 4 to 6 digit PIN' : 'Enter it again to confirm';

  return (
    <Sheet label={props.title} onClose={props.onClose}>
      <h2 className="sheet-title">{props.title}</h2>
      <p className="pin-sheet__prompt">{prompt}</p>
      <Keypad
        value={entry}
        dots={props.mode === 'verify' ? verifyLength : Math.max(4, entry.length)}
        disabled={checking}
        onDigit={onDigit}
        onDelete={() => setEntry((e) => e.slice(0, -1))}
      />
      {error && <p className="lock__error" role="alert">{error}</p>}
      {props.mode === 'setup' && (
        <button type="button" className="btn btn--primary btn--block pin-sheet__next" disabled={!isValidPin(entry)} onClick={next}>
          {step === 'enter' ? 'Next' : props.confirmLabel}
        </button>
      )}
    </Sheet>
  );
}
