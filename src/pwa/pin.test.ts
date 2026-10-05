import { describe, expect, it } from 'vitest';
import { hashPin, isValidPin, shouldRelock, verifyPin } from './pin';

describe('PIN hashing', () => {
  it('verifies the right PIN and rejects a wrong one', async () => {
    const stored = await hashPin('2580');
    expect(stored.hash).not.toContain('2580');
    expect(await verifyPin('2580', stored)).toBe(true);
    expect(await verifyPin('2581', stored)).toBe(false);
  });

  it('salts each hash', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('accepts 4 to 6 digits only', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });
});

describe('shouldRelock', () => {
  const t0 = 1_000_000;
  it('relocks immediately or after the chosen time away', () => {
    expect(shouldRelock(t0, t0 + 1_000, 'immediate')).toBe(true);
    expect(shouldRelock(t0, t0 + 59_000, '1m')).toBe(false);
    expect(shouldRelock(t0, t0 + 60_000, '1m')).toBe(true);
    expect(shouldRelock(t0, t0 + 299_000, '5m')).toBe(false);
    expect(shouldRelock(t0, t0 + 300_000, '5m')).toBe(true);
  });

  it('does nothing if the app was never hidden', () => {
    expect(shouldRelock(null, t0, 'immediate')).toBe(false);
  });
});
