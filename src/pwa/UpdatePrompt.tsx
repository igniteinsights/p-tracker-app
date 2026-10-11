import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ConfirmDialog } from '../ui/common/ConfirmDialog';
import { notesSince, parseReleases } from './version';

const CHECK_EVERY_MS = 60 * 60 * 1000;
const MAX_NOTES = 6;

interface Latest {
  version: string | null;
  notes: string[];
}

/** The version on the server and what changed since this one, which this copy of the app can't know until it asks. */
async function fetchLatest(): Promise<Latest | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
    const { version, releases } = (await res.json()) as { version?: unknown; releases?: unknown };
    return {
      version: typeof version === 'string' ? version : null,
      notes: notesSince(parseReleases(releases), __APP_VERSION__),
    };
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
  const [latest, setLatest] = useState<Latest | null>(null);

  useEffect(() => {
    if (!needRefresh) return;
    let live = true;
    void fetchLatest().then((v) => { if (live) setLatest(v); });
    return () => { live = false; };
  }, [needRefresh]);

  // "Later" lasts until the app is next reopened
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setLater(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  if (!needRefresh || later) return null;
  const version = latest?.version;
  const notes = latest?.notes ?? [];
  return (
    <ConfirmDialog
      title="App update available"
      body={
        <>
          <p className="update__versions">
            {version && version !== __APP_VERSION__ ? <>Version <strong>{version}</strong> is ready. </> : 'A new version is ready. '}
            You have {__APP_VERSION__}.
          </p>
          {notes.length > 0 ? (
            <div className="update__notes">
              <h3>What's new</h3>
              <ul>
                {notes.slice(0, MAX_NOTES).map((n, i) => <li key={i}>{n}</li>)}
                {notes.length > MAX_NOTES && <li>And more fixes and improvements.</li>}
              </ul>
            </div>
          ) : (
            <p className="update__versions">Update now to get the latest features and fixes.</p>
          )}
          <p>Your data stays on this phone.</p>
        </>
      }
      confirmLabel="Update now"
      cancelLabel="Later"
      onConfirm={() => void updateServiceWorker(true)}
      onCancel={() => setLater(true)}
    />
  );
}
