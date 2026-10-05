import type { ReactElement } from 'react';
import { CalendarIcon, SettingsIcon, TodayIcon } from './icons';
import './Nav.css';

export type Tab = 'today' | 'calendar' | 'settings';

const ITEMS: { tab: Tab; label: string; Icon: () => ReactElement }[] = [
  { tab: 'today', label: 'Today', Icon: TodayIcon },
  { tab: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { tab: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export function Nav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="nav" aria-label="Main">
      {ITEMS.map(({ tab: t, label, Icon }) => (
        <button key={t} type="button" className={`nav__item${t === tab ? ' nav__item--on' : ''}`} aria-current={t === tab ? 'page' : undefined} onClick={() => onChange(t)}>
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
