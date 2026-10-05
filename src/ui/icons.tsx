const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true } as const;

export const TodayIcon = () => <svg {...base}><circle cx="12" cy="12" r="8" /></svg>;
export const CalendarIcon = () => <svg {...base}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16" /></svg>;
export const SettingsIcon = () => <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>;
export const ChevronLeft = () => <svg {...base}><path d="M15 5l-7 7 7 7" /></svg>;
export const ChevronRight = () => <svg {...base}><path d="M9 5l7 7-7 7" /></svg>;
