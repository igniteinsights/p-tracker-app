import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Meta } from '../../data';
import { shouldRelock } from '../../pwa/pin';
import { LockScreen } from './LockScreen';

/** Shows the lock screen instead of the app when a PIN is set: on open, and after time away. */
export function LockGate({ meta, children }: { meta: Meta; children: ReactNode }) {
  const enabled = meta.pinHash !== null;
  // Locked on open; turning the PIN on while using the app doesn't lock straight away
  const [locked, setLocked] = useState(enabled);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) setLocked(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
      } else {
        if (shouldRelock(hiddenAt.current, Date.now(), meta.lockAfter)) setLocked(true);
        hiddenAt.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, meta.lockAfter]);

  if (enabled && locked) return <LockScreen meta={meta} onUnlock={() => setLocked(false)} />;
  return <>{children}</>;
}
