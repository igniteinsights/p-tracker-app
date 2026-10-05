// Light / dark theme. The choice is a per-phone preference kept in localStorage
// (it has to be readable synchronously, before the first paint — see index.html).

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'p-tracker-theme';
const BAR_COLOUR = { light: '#FBFAFB', dark: '#151215' } as const;
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(pref: ThemePref, prefersDark: boolean): 'light' | 'dark' {
  return pref === 'system' ? (prefersDark ? 'dark' : 'light') : pref;
}

export function applyTheme(pref: ThemePref = getThemePref()) {
  const theme = resolveTheme(pref, window.matchMedia?.(DARK_QUERY).matches ?? false);
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = BAR_COLOUR[theme];
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch { /* storage unavailable: still apply for this session */ }
  applyTheme(pref);
}

/** Re-apply when the phone switches between light and dark, if following the phone. */
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia?.(DARK_QUERY);
  if (!mq) return () => {};
  const onChange = () => { if (getThemePref() === 'system') applyTheme('system'); };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
