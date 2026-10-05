import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import './ui/tokens.css';
import './ui/base.css';
import './pwa/pwa.css';
import { db } from './data';
import { App } from './ui/App';
import { NoStorage } from './pwa/NoStorage';
import { listenForInstallPrompt } from './pwa/installPrompt';
import { applyTheme, watchSystemTheme } from './ui/theme';

applyTheme();
watchSystemTheme();

listenForInstallPrompt();

const root = createRoot(document.getElementById('root')!);

db.open()
  .then(() => root.render(<StrictMode><App /></StrictMode>))
  .catch(() => root.render(<NoStorage />));
