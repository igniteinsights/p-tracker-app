import { useEffect, useRef, type ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { useBackClose } from './useBackClose';

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useBackClose(onClose);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="layer">
      <div className="layer__dim" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet__grab" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
