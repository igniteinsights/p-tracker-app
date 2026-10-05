import { describe, expect, it } from 'vitest';
import { isIos } from './platform';

describe('isIos', () => {
  it('detects iPhone and iPadOS desktop-mode Safari', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true);
  });
  it('ignores Android and desktop Macs', () => {
    expect(isIos('Mozilla/5.0 (Linux; Android 15; Pixel 7)', 'Linux armv8l', 5)).toBe(false);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false);
  });
});
