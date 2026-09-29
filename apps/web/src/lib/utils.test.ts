import { describe, expect, it } from 'vitest';
import { cleanParams, formatHours, initials, safeNext } from './utils';

describe('safeNext', () => {
  it('allows same-origin paths', () => {
    expect(safeNext('/issues/abc?x=1')).toBe('/issues/abc?x=1');
  });

  it.each(['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', null])(
    'rejects open redirects: %s',
    (value) => {
      expect(safeNext(value)).toBe('/issues');
    },
  );
});

describe('cleanParams', () => {
  it('drops empty values and joins arrays', () => {
    expect(
      cleanParams({ a: undefined, b: '', c: null, d: [], e: ['x', 'y'], f: 0, g: 'z' }),
    ).toEqual({
      e: 'x,y',
      f: '0',
      g: 'z',
    });
  });
});

describe('formatting', () => {
  it('builds initials from names, skipping titles like "Engr."', () => {
    expect(initials('Tanvir Ahmed')).toBe('TA');
    expect(initials('Engr. Kamal Uddin')).toBe('EK');
    expect(initials('')).toBe('?');
  });

  it('formats durations for humans', () => {
    expect(formatHours(null)).toBe('—');
    expect(formatHours(0.5)).toBe('30m');
    expect(formatHours(20)).toBe('20h');
    expect(formatHours(96)).toBe('4d');
  });
});
