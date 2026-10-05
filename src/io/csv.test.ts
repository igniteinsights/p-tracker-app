import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('writes a BOM, header and sorted rows with RFC 4180 quoting', () => {
    const csv = toCsv([
      { date: '2024-01-02', type: 'note', text: 'Beach, "alt" plan\nline two 🌙' },
      { date: '2024-01-02', type: 'flow', value: 'heavy' },
      { date: '2024-01-01', type: 'period-start' },
    ]);
    expect(csv).toBe(
      '﻿date,type,value,note\r\n' +
      '2024-01-01,period-start,,\r\n' +
      '2024-01-02,flow,heavy,\r\n' +
      '2024-01-02,note,,"Beach, ""alt"" plan\nline two 🌙"\r\n',
    );
  });
});
