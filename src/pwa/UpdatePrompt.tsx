import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ConfirmDialog } from '../ui/common/ConfirmDialog';

const CHECK_EVERY_MS = 60 * 60 * 1000;

/** The version on the server, which this copy of the app can't know until it asks. */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
    const { version } = (await res.json()) as { version?: unknown };
    return typeof version === 'string' ? version : null;
  } catch {
    return null;
  }
}

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
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    if (!needRefresh) return;
    let live = true;
    void fetchLatestVersion().then((v) => { if (live) setLatest(v); });
    return () => { live = false; };
  }, [needRefresh]);

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
      body={
        <>
          <p className="update__versions">
            {latest && latest !== __APP_VERSION__ ? <>Version <strong>{latest}</strong> is ready. </> : 'A new version is ready. '}
            You have {__APP_VERSION__}.
          </p>
          <p>Update now to get the latest features and fixes. Your data stays on this phone.</p>
        </>
      }
      confirmLabel="Update now"
      cancelLabel="Later"
      onConfirm={() => void updateServiceWorker(true)}
      onCancel={() => setLater(true)}
    />
  );
}
