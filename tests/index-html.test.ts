import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('index.html', () => {
  it('resizes the layout for the on-screen keyboard so Save stays reachable on Android', () => {
    expect(readFileSync('index.html', 'utf8')).toMatch(/name="viewport"[^>]*interactive-widget=resizes-content/);
  });
});
