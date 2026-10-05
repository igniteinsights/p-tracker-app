import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrivacySection } from './PrivacySection';
import { ToastProvider } from '../common/Toast';
import { repo } from '../../data';
import { DEFAULT_META, type Meta } from '../../data/repo';
import { hashPin, verifyPin } from '../../pwa/pin';

async function typePin(pin: string) {
  for (const d of pin) await userEvent.click(screen.getByRole('button', { name: d }));
}

beforeEach(async () => {
  await repo.deleteAll();
  await repo.setMeta({ pinHash: null, pinSalt: null, pinLength: null, lastBackupAt: null });
});

const renderPrivacy = (meta: Meta) =>
  render(<ToastProvider><PrivacySection meta={meta} hasData onExport={() => {}} onDeleteAll={() => {}} /></ToastProvider>);

describe('PrivacySection', () => {
  it('states where data lives and when it was last backed up', () => {
    renderPrivacy({ ...DEFAULT_META, lastBackupAt: '2026-09-20T09:00:00.000Z' });
    expect(screen.getByText(/stored only on this phone/)).toBeInTheDocument();
    expect(screen.getByText('20 Sep 2026')).toBeInTheDocument();
  });

  it('sets a PIN after entering it twice', async () => {
    renderPrivacy(DEFAULT_META);
    await userEvent.click(screen.getByRole('switch', { name: /PIN lock/ }));
    await typePin('2468');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await typePin('2468');
    await userEvent.click(screen.getByRole('button', { name: 'Turn on PIN lock' }));
    await waitFor(async () => {
      const meta = await repo.getMeta();
      expect(meta.pinHash).not.toBeNull();
      expect(await verifyPin('2468', { hash: meta.pinHash!, salt: meta.pinSalt! })).toBe(true);
    });
  });

  it('rejects a confirmation that does not match', async () => {
    renderPrivacy(DEFAULT_META);
    await userEvent.click(screen.getByRole('switch', { name: /PIN lock/ }));
    await typePin('2468');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await typePin('1357');
    await userEvent.click(screen.getByRole('button', { name: 'Turn on PIN lock' }));
    expect(await screen.findByText("The PINs don't match. Try again.")).toBeInTheDocument();
  });

  it('asks for the current PIN before turning the lock off', async () => {
    const { hash, salt } = await hashPin('2468');
    const meta = { ...DEFAULT_META, pinHash: hash, pinSalt: salt, pinLength: 4 };
    await repo.setMeta(meta);
    renderPrivacy(meta);
    await userEvent.click(screen.getByRole('switch', { name: /PIN lock/ }));
    await typePin('2468');
    await waitFor(async () => expect((await repo.getMeta()).pinHash).toBeNull());
  });
});
