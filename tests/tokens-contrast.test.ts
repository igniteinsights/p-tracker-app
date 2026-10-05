// Every text/background pairing used in the UI must stay readable in both themes.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/ui/tokens.css', 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return {};
  const body = css.slice(start, css.indexOf('\n}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => [m[1], m[2]]));
}

const light = block(':root');
const dark = { ...light, ...block(":root[data-theme='dark']") };

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background] pairs that carry text
const PAIRS: [string, string][] = [
  ['--ink', '--bg'], ['--ink', '--surface'], ['--muted', '--bg'], ['--muted', '--surface'], ['--text-2', '--bg'],
  ['--on-ink', '--ink'], ['--on-berry', '--berry'], ['--on-teal', '--teal'], ['--berry', '--berry-soft'],
  ['--danger', '--bg'], ['--warn-text', '--warn-bg'], ['--on-ink-accent', '--ink'], ['--on-ink-muted', '--ink'],
  ['--stage-follicular-text', '--bg'], ['--stage-fertile-text', '--bg'], ['--stage-luteal-text', '--bg'],
];

describe.each([['light', light], ['dark', dark]] as const)('%s theme tokens', (_name, t) => {
  it('defines a dark theme block', () => {
    expect(Object.keys(block(":root[data-theme='dark']")).length).toBeGreaterThan(20);
  });

  it.each(PAIRS)('%s on %s meets 4.5:1', (fg, bg) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
