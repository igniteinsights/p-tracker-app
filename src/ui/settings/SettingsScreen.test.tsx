import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from './SettingsScreen';
import { ToastProvider } from '../common/Toast';
import { repo } from '../../data';
import { DEFAULT_SETTINGS } from '../../domain/types';
import { DEFAULT_META } from '../../data/repo';
import type { DataState } from '../../data/useData';

const data: DataState = { ready: true, entries: [], settings: DEFAULT_SETTINGS, meta: DEFAULT_META, today: '2026-10-05', prediction: null };

beforeEach(async () => { await repo.deleteAll(); });

describe('SettingsScreen predictions', () => {
  it('turns on the irregular cycles switch', async () => {
    render(<ToastProvider><SettingsScreen data={data} onOpenHistory={() => {}} /></ToastProvider>);
    await userEvent.click(screen.getByRole('switch', { name: /Irregular cycles/ }));
    await waitFor(async () => expect((await repo.getSettings()).irregular).toBe(true));
  });

  it('opens cycle history', async () => {
    const onOpenHistory = vi.fn();
    render(<ToastProvider><SettingsScreen data={data} onOpenHistory={onOpenHistory} /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: /Cycle history/ }));
    expect(onOpenHistory).toHaveBeenCalled();
  });
});

describe('SettingsScreen extra tracking', () => {
  it('switches on a tracking type', async () => {
    render(<ToastProvider><SettingsScreen data={data} onOpenHistory={() => {}} /></ToastProvider>);
    await userEvent.click(screen.getByRole('switch', { name: /Flow level/ }));
    await waitFor(async () => expect((await repo.getSettings()).tracking).toEqual(['flow']));
  });
});

describe('SettingsScreen appearance', () => {
  it('switches to the dark theme', async () => {
    render(<ToastProvider><SettingsScreen data={data} onOpenHistory={() => {}} /></ToastProvider>);
    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
