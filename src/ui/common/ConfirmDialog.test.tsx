import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

function Harness({ onCancel }: { onCancel: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      {open && (
        <ConfirmDialog
          title="Delete all data?"
          confirmLabel="Delete"
          onConfirm={() => setOpen(false)}
          onCancel={() => { onCancel(); setOpen(false); }}
        />
      )}
    </>
  );
}

describe('ConfirmDialog', () => {
  it('moves focus into the dialog, closes on Escape and returns focus', async () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    expect(screen.getByRole('alertdialog')).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it('keeps Tab focus inside the dialog', async () => {
    render(<Harness onCancel={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    for (let i = 0; i < 4; i++) {
      await userEvent.tab();
      expect(screen.getByRole('alertdialog')).toContainElement(document.activeElement as HTMLElement);
    }
  });
});
