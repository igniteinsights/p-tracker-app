import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToday } from './useData';

afterEach(() => { vi.useRealTimers(); });

describe('useToday', () => {
  it('switches to the new date right at local midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 50));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-10-05');
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(result.current).toBe('2026-10-06');
  });
});
