// The PIN is a screen lock: it hides the app but does not encrypt the data.
// Only a salted PBKDF2 hash is stored, never the PIN itself.

export type LockAfter = 'immediate' | '1m' | '5m';

export interface StoredPin {
  hash: string;
  salt: string;
}

const ITERATIONS = 210_000;
const RELOCK_MS: Record<LockAfter, number> = { immediate: 0, '1m': 60_000, '5m': 300_000 };

const toB64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

export async function hashPin(pin: string, salt: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(16))): Promise<StoredPin> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return { hash: toB64(bits), salt: toB64(salt) };
}

export async function verifyPin(pin: string, stored: StoredPin): Promise<boolean> {
  const { hash } = await hashPin(pin, fromB64(stored.salt));
  // Compare every character so timing doesn't reveal how much matched
  let diff = hash.length ^ stored.hash.length;
  for (let i = 0; i < Math.min(hash.length, stored.hash.length); i++) diff |= hash.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  return diff === 0;
}

/** True when the app was hidden for at least the chosen time and should lock again. */
export function shouldRelock(hiddenAt: number | null, now: number, after: LockAfter): boolean {
  return hiddenAt !== null && now - hiddenAt >= RELOCK_MS[after];
}
