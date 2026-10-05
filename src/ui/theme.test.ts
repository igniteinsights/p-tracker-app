import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, getThemePref, resolveTheme, setThemePref } from './theme';

afterEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
  delete document.documentElement.dataset.theme;
});

describe('theme', () => {
  it('follows the system unless a theme is chosen', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('remembers the choice and applies it to the page', () => {
    expect(getThemePref()).toBe('system');
    setThemePref('dark');
    expect(getThemePref()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    setThemePref('system');
    expect(getThemePref()).toBe('system');
  });

  it('updates the browser bar colour', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    applyTheme('dark');
    expect(meta.content).toBe('#151215');
    applyTheme('light');
    expect(meta.content).toBe('#FBFAFB');
    meta.remove();
  });
});
