import type { ReactNode } from 'react';

interface KeypadProps {
  /** Digits entered so far */
  value: string;
  /** Dots to show: the PIN's length when known, otherwise the digits entered */
  dots: number;
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** Bottom-left key, e.g. "Forgot PIN?" */
  extra?: ReactNode;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function Keypad({ value, dots, disabled, onDigit, onDelete, extra }: KeypadProps) {
  return (
    <div className="keypad">
      <div className="keypad__dots" aria-label={`${value.length} digits entered`} role="status">
        {Array.from({ length: Math.max(dots, 4) }, (_, i) => (
          <span key={i} className={`keypad__dot${i < value.length ? ' keypad__dot--on' : ''}`} />
        ))}
      </div>
      <div className="keypad__grid">
        {DIGITS.map((d) => (
          <button key={d} type="button" className="keypad__key" disabled={disabled} onClick={() => onDigit(d)}>{d}</button>
        ))}
        <span className="keypad__extra">{extra}</span>
        <button type="button" className="keypad__key" disabled={disabled} onClick={() => onDigit('0')}>0</button>
        <button type="button" className="keypad__key keypad__key--quiet" aria-label="Delete digit" disabled={disabled || !value} onClick={onDelete}>⌫</button>
      </div>
    </div>
  );
}
