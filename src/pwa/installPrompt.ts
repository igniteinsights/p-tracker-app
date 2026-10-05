// Chrome on Android fires `beforeinstallprompt` when the app can be installed.
// We keep the event so our own banner can open the real install dialog later.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const INSTALL_SNOOZE_DAYS = 14;

let deferred: BeforeInstallPromptEvent | null = null;
let listening = false;
const subscribers = new Set<() => void>();

function set(next: BeforeInstallPromptEvent | null) {
  deferred = next;
  subscribers.forEach((fn) => fn());
}

/** Call once at startup, before React renders: the event can fire very early. */
export function listenForInstallPrompt() {
  if (listening) return;
  listening = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // use our banner instead of Chrome's mini-infobar
    set(e as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => set(null));
}

export const getInstallPrompt = () => deferred;

export function subscribeInstallPrompt(fn: () => void) {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

/** Opens the browser's install dialog. The event can only be used once. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred;
  if (!e) return 'unavailable';
  set(null);
  await e.prompt();
  return (await e.userChoice).outcome;
}

export function shouldOfferInstall(
  { available, standalone, dismissedAt }: { available: boolean; standalone: boolean; dismissedAt: string | null },
  now: Date = new Date(),
): boolean {
  if (!available || standalone) return false;
  if (!dismissedAt) return true;
  return now.getTime() - new Date(dismissedAt).getTime() > INSTALL_SNOOZE_DAYS * 86_400_000;
}
