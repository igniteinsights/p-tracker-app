import { useEffect, useRef } from 'react';

// Each open overlay (sheet or dialog) owns one history entry, so the Android
// back button closes the top overlay instead of leaving the app. Overlays are
// told apart by the id stored in history.state: after a pop, any open overlay
// whose id is above the current entry's id was backed out of by the user.
const stack: number[] = [];
const handlers = new Map<number, () => void>();
let seq = 0;
let pendingBack = 0;
let listening = false;

const currentOverlay = (): number => (history.state as { overlay?: number } | null)?.overlay ?? 0;

function onPopState() {
  const top = stack.at(-1);
  if (top !== undefined && top > currentOverlay()) handlers.get(top)?.();
}

function flushBack() {
  if (pendingBack === 0) return;
  const n = pendingBack;
  pendingBack = 0;
  history.go(-n);
}

export function useBackClose(onBack: () => void) {
  const latest = useRef(onBack);
  latest.current = onBack;

  useEffect(() => {
    const id = ++seq;
    stack.push(id);
    // Re-arm before handling: the overlay may stay open (e.g. "Discard changes?").
    handlers.set(id, () => {
      history.pushState({ overlay: id }, '');
      latest.current();
    });
    if (pendingBack > 0) {
      // An overlay closed in the same tick; reuse its entry.
      pendingBack--;
      history.replaceState({ overlay: id }, '');
    } else {
      history.pushState({ overlay: id }, '');
    }
    if (!listening) {
      window.addEventListener('popstate', onPopState);
      listening = true;
    }
    return () => {
      handlers.delete(id);
      const i = stack.lastIndexOf(id);
      if (i !== -1) stack.splice(i, 1);
      if (currentOverlay() >= id) {
        pendingBack++;
        queueMicrotask(flushBack);
      }
    };
  }, []);
}
