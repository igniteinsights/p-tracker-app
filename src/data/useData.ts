import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { todayISO, type ISODate } from '../domain/dates';
import { predict, type Prediction } from '../domain/predict';
import { DEFAULT_SETTINGS, type Entry, type Settings } from '../domain/types';
import { DEFAULT_META, repo, type Meta } from './index';

export interface DataState {
  ready: boolean;
  entries: Entry[];
  settings: Settings;
  meta: Meta;
  today: ISODate;
  prediction: Prediction | null;
}

export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const tick = () => setToday(todayISO());
    let midnight = 0;
    const scheduleMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      midnight = window.setTimeout(() => { tick(); scheduleMidnight(); }, next.getTime() - now.getTime());
    };
    scheduleMidnight();
    // The interval and visibility check catch up after the phone sleeps.
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearTimeout(midnight);
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}

export function useData(): DataState {
  const entries = useLiveQuery(() => repo.listEntries(), []);
  const settings = useLiveQuery(() => repo.getSettings(), []);
  const meta = useLiveQuery(() => repo.getMeta(), []);
  const today = useToday();
  const prediction = useMemo(
    () => (entries && settings ? predict(entries, settings, today) : null),
    [entries, settings, today],
  );
  return {
    ready: entries !== undefined && settings !== undefined && meta !== undefined,
    entries: entries ?? [],
    settings: settings ?? DEFAULT_SETTINGS,
    meta: meta ?? DEFAULT_META,
    today,
    prediction,
  };
}
