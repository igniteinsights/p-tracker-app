import { useCallback, useState } from 'react';
import type { ISODate } from '../domain/dates';
import { useData } from '../data/useData';
import { Nav, type Tab } from './Nav';
import { ToastProvider } from './common/Toast';
import { TodayScreen } from './today/TodayScreen';
import { CalendarScreen } from './calendar/CalendarScreen';
import { LogSheet } from './log/LogSheet';
import { SettingsScreen } from './settings/SettingsScreen';
import { UpdatePrompt } from '../pwa/UpdatePrompt';
import { IosInstallHint } from '../pwa/IosInstallHint';
import './common/common.css';

export function App() {
  const data = useData();
  const [tab, setTab] = useState<Tab>('today');
  const [log, setLog] = useState<{ date: ISODate; focusNote: boolean } | null>(null);
  const openLog = useCallback((date: ISODate, focusNote = false) => setLog({ date, focusNote }), []);

  if (!data.ready) return <div className="app" />;

  return (
    <ToastProvider>
      <div className="app">
        <main className="screen">
          {tab === 'today' && (
            <TodayScreen data={data} onOpenCalendar={() => setTab('calendar')} onOpenLog={openLog} onOpenSettings={() => setTab('settings')} />
          )}
          {tab === 'calendar' && <CalendarScreen data={data} onOpenLog={(d) => openLog(d)} />}
          {tab === 'settings' && <SettingsScreen data={data} />}
        </main>
        <Nav tab={tab} onChange={setTab} />
        {log && (
          <LogSheet
            key={log.date}
            date={log.date}
            entries={data.entries}
            today={data.today}
            focusNote={log.focusNote}
            onClose={() => setLog(null)}
            onChangeDate={(date) => setLog({ date, focusNote: false })}
          />
        )}
        <UpdatePrompt />
        <IosInstallHint dismissed={data.meta.iosHintDismissed} />
      </div>
    </ToastProvider>
  );
}
