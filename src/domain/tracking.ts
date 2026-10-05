import type { TrackingType } from './types';

export interface TrackingDef {
  type: TrackingType;
  label: string;
  /** Short name used in summaries, e.g. "heavy flow" */
  noun: string;
  options: { value: string; label: string }[];
}

export const TRACKING: readonly TrackingDef[] = [
  { type: 'flow', label: 'Flow', noun: 'flow', options: [
    { value: 'spotting', label: 'Spotting' }, { value: 'light', label: 'Light' }, { value: 'medium', label: 'Medium' }, { value: 'heavy', label: 'Heavy' },
  ] },
  { type: 'pain', label: 'Pain', noun: 'pain', options: [
    { value: 'none', label: 'None' }, { value: 'mild', label: 'Mild' }, { value: 'moderate', label: 'Moderate' }, { value: 'strong', label: 'Strong' },
  ] },
  { type: 'mood', label: 'Mood', noun: 'mood', options: [
    { value: 'good', label: 'Good' }, { value: 'okay', label: 'Okay' }, { value: 'low', label: 'Low' }, { value: 'irritable', label: 'Irritable' }, { value: 'anxious', label: 'Anxious' },
  ] },
  { type: 'energy', label: 'Energy', noun: 'energy', options: [
    { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' },
  ] },
];

export const TRACKING_TYPES: readonly TrackingType[] = TRACKING.map((t) => t.type);

export const trackingDef = (type: TrackingType) => TRACKING.find((t) => t.type === type)!;

export const isTrackingType = (t: string): t is TrackingType => (TRACKING_TYPES as readonly string[]).includes(t);

export const isValidTrackingValue = (type: TrackingType, value: unknown) =>
  typeof value === 'string' && trackingDef(type).options.some((o) => o.value === value);

/** "heavy flow", "no pain", "low mood" */
export function trackingSummary(type: TrackingType, value: string): string {
  if (type === 'pain' && value === 'none') return 'no pain';
  return `${value} ${trackingDef(type).noun}`;
}
