import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ConfirmDialog } from '../ui/common/ConfirmDialog';

const CHECK_EVERY_MS = 60 * 60 * 1000;

/** Asks the service worker to look for a new version, unless offline. */
function checkForUpdate(reg: ServiceWorkerRegistration) {
  if (navigator.onLine === false) return;
  reg.update().catch(() => { /* offline or server unreachable; try again later */ });
}

export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // An installed app can stay open for days, so check hourly and whenever it's reopened
      setInterval(() => checkForUpdate(reg), CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate(reg);
      });
    },
  });
  const [later, setLater] = useState(false);

  // "Later" lasts until the app is next reopened
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setLater(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  if (!needRefresh || later) return null;
  return (
    <ConfirmDialog
      title="App update available"
      body="A new version of p-tracker is ready. Update now to get the latest features and fixes. Your data stays on this phone."
      confirmLabel="Update now"
      cancelLabel="Later"
      onConfirm={() => void updateServiceWorker(true)}
      onCancel={() => setLater(true)}
    />
  );
}
