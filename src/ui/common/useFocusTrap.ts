import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

// Only the most recently opened overlay traps focus (a dialog can sit inside a sheet).
const traps: HTMLElement[] = [];

/** Moves focus into the overlay, keeps Tab inside it, and restores focus when it closes. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  // Captured during render, before anything inside the overlay takes focus.
  const previous = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    traps.push(el);
    if (!el.contains(document.activeElement)) (el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || traps.at(-1) !== el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!el.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const restoreTo = previous.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = traps.lastIndexOf(el);
      if (i !== -1) traps.splice(i, 1);
      if (restoreTo?.isConnected) restoreTo.focus();
    };
  }, [ref]);
}
