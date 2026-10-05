import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { useBackClose } from './useBackClose';

interface ConfirmDialogProps {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  requireText?: string;
  destructive?: boolean;
  secondary?: { label: string; run: () => void };
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const { title, body, confirmLabel, cancelLabel = 'Cancel', requireText, destructive, secondary, onConfirm, onCancel } = props;
  const [typed, setTyped] = useState('');
  useBackClose(onCancel);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  useEffect(() => {
    // Capture phase, so a sheet underneath doesn't also treat Escape as "close".
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      cancel.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  const ok = !requireText || typed.trim().toLowerCase() === requireText;

  return (
    <div className="layer layer--center">
      <div className="layer__dim" onClick={onCancel} />
      <div ref={ref} tabIndex={-1} className="dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2 className="dialog__title">{title}</h2>
        {body && <div className="dialog__body">{body}</div>}
        {secondary && (
          <button type="button" className="btn btn--quiet btn--block" onClick={secondary.run}>{secondary.label}</button>
        )}
        {requireText && (
          <input
            className="input"
            aria-label={`Type ${requireText} to confirm`}
            placeholder={`Type ${requireText} to confirm`}
            value={typed}
            autoCapitalize="none"
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
          />
        )}
        <div className="dialog__actions">
          <button type="button" className="btn btn--quiet" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`btn ${destructive ? 'btn--danger' : 'btn--primary'}`} disabled={!ok} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
