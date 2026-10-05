import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="banner" role="status">
      <span>Update ready</span>
      <button type="button" className="banner__action" onClick={() => void updateServiceWorker(true)}>Reload</button>
    </div>
  );
}
