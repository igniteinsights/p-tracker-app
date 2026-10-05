import { repo } from '../data';
import { isIos, isStandalone } from './platform';

export function IosInstallHint({ dismissed }: { dismissed: boolean }) {
  if (dismissed || isStandalone() || !isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) return null;
  return (
    <div className="banner banner--top" role="note">
      <span>Install p-tracker: tap Share, then Add to Home Screen.</span>
      <button type="button" className="banner__action" onClick={() => void repo.setMeta({ iosHintDismissed: true })}>Got it</button>
    </div>
  );
}
