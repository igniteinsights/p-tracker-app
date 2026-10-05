import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportFlow } from './ImportFlow';
import { ToastProvider } from '../common/Toast';
import { repo } from '../../data';

const sample = readFileSync('tests/fixtures/sample.myd', 'utf8');

function setup(hasData = false) {
  const onClose = vi.fn();
  render(<ToastProvider><ImportFlow hasData={hasData} onClose={onClose} /></ToastProvider>);
  return { onClose };
}

async function choose(name: string, text: string) {
  await userEvent.upload(screen.getByLabelText('Choose a file'), new File([text], name, { type: 'text/plain' }));
}

beforeEach(async () => { await repo.deleteAll(); });

describe('ImportFlow', () => {
  it('previews a MyDays file and merges it', async () => {
    const { onClose } = setup();
    await choose('Default_User.myd', sample);
    expect(await screen.findByText('8 period starts, 1 period end, 2 intimacy, 3 notes')).toBeInTheDocument();
    expect(screen.getByText('Jun 2023 – Jan 2024')).toBeInTheDocument();
    expect(screen.getByText('14 new entries')).toBeInTheDocument();
    expect(screen.getByText(/2 lines couldn't be read exactly/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Merge' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(await repo.listEntries()).toHaveLength(14);
    expect(await screen.findByText('Imported 14 entries')).toBeInTheDocument();
  });

  it('shows a specific error and writes nothing for a bad file', async () => {
    setup();
    await choose('backup.json', '{"app":"p-tracker","schemaVersion":9,"entries":[]}');
    expect(await screen.findByText('This backup is from a newer version of p-tracker. Update the app and try again.')).toBeInTheDocument();
    expect(await repo.listEntries()).toEqual([]);
  });

  it('warns about entries dated after today', async () => {
    setup();
    const backup = JSON.stringify({ app: 'p-tracker', schemaVersion: 1, entries: [{ date: '2099-02-08', type: 'period-start' }, { date: '2024-01-01', type: 'intimacy' }] });
    await choose('backup.json', backup);
    expect(await screen.findByText(/1 entry is dated after today/)).toBeInTheDocument();
  });

  it('does not offer Replace for a file with no entries', async () => {
    setup(true);
    await choose('backup.json', JSON.stringify({ app: 'p-tracker', schemaVersion: 1, entries: [] }));
    expect(await screen.findByRole('button', { name: 'Replace everything' })).toBeDisabled();
  });

  it('clears the file picker so the same file can be chosen again', async () => {
    setup();
    await choose('backup.json', 'not json');
    await screen.findByText('This file is not valid JSON.');
    expect((screen.getByLabelText('Choose a file') as HTMLInputElement).value).toBe('');
  });

  it('requires a second confirmation to replace everything', async () => {
    await repo.saveDay('2020-01-01', { periodStart: false, periodEnd: false, intimacy: true, note: '', tracking: {} });
    setup(true);
    await choose('Default_User.myd', sample);
    await userEvent.click(await screen.findByRole('button', { name: 'Replace everything' }));
    expect(screen.getByText('Replace all your data?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Replace' }));
    await waitFor(async () => expect(await repo.listEntries()).toHaveLength(14));
  });
});
