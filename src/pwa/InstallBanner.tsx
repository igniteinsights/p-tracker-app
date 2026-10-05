import { useSyncExternalStore } from 'react';
import { repo } from '../data';
import { getInstallPrompt, promptInstall, shouldOfferInstall, subscribeInstallPrompt } from './installPrompt';
import { isStandalone } from './platform';

export function InstallBanner({ dismissedAt }: { dismissedAt: string | null }) {
  const available = useSyncExternalStore(subscribeInstallPrompt, () => getInstallPrompt() !== null);
  if (!shouldOfferInstall({ available, standalone: isStandalone(), dismissedAt })) return null;
  return (
    <div className="banner banner--install" role="region" aria-label="Install app">
      <span className="banner__text">
        <strong>Install p-tracker</strong>
        <small>Opens like an app and works offline.</small>
      </span>
      <span className="banner__actions">
        <button type="button" className="banner__action banner__action--quiet" onClick={() => void repo.setMeta({ installDismissedAt: new Date().toISOString() })}>
          Not now
        </button>
        <button type="button" className="banner__action banner__action--primary" onClick={() => void promptInstall()}>
          Install
        </button>
      </span>
    </div>
  );
}
