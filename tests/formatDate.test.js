import { describe, test, expect } from 'vitest';
import { formatLinkDate, ordinal } from '../src/utils/formatDate.js';

// Fixed reference point: 2026-08-26T12:00:00 local time.
const NOW = new Date(2026, 7, 26, 12, 0, 0).getTime();
const ago = (ms) => new Date(NOW - ms).toISOString();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

describe('ordinal', () => {
  test.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'],
    [11, '11th'], [12, '12th'], [13, '13th'],
    [21, '21st'], [22, '22nd'], [23, '23rd'], [31, '31st'],
  ])('%i -> %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});

describe('formatLinkDate', () => {
  describe('within the last 24 hours', () => {
    test('under a minute is "just now"', () => {
      expect(formatLinkDate(ago(0), NOW)).toBe('just now');
      expect(formatLinkDate(ago(59 * 1000), NOW)).toBe('just now');
    });

    test('minutes', () => {
      expect(formatLinkDate(ago(1 * MIN), NOW)).toBe('1 min ago');
      expect(formatLinkDate(ago(12 * MIN + 30 * 1000), NOW)).toBe('12 min ago');
      expect(formatLinkDate(ago(59 * MIN), NOW)).toBe('59 min ago');
    });

    test('hours, singular and plural', () => {
      expect(formatLinkDate(ago(1 * HOUR), NOW)).toBe('1 hour ago');
      expect(formatLinkDate(ago(1 * HOUR + 59 * MIN), NOW)).toBe('1 hour ago');
      expect(formatLinkDate(ago(3 * HOUR), NOW)).toBe('3 hours ago');
      expect(formatLinkDate(ago(23 * HOUR + 59 * MIN), NOW)).toBe('23 hours ago');
    });
  });

  describe('older than 24 hours', () => {
    test('exactly 24 hours switches to the long form', () => {
      expect(formatLinkDate(ago(24 * HOUR), NOW)).toBe('August 25th 2026');
    });

    test('expands numeric dates to "Month Dth YYYY"', () => {
      expect(formatLinkDate(new Date(2026, 7, 25, 9, 30).toISOString(), NOW)).toBe('August 25th 2026');
      expect(formatLinkDate(new Date(2026, 0, 1).toISOString(), NOW)).toBe('January 1st 2026');
      expect(formatLinkDate(new Date(2025, 11, 22).toISOString(), NOW)).toBe('December 22nd 2025');
      expect(formatLinkDate(new Date(2025, 2, 3).toISOString(), NOW)).toBe('March 3rd 2025');
      expect(formatLinkDate(new Date(2024, 10, 11).toISOString(), NOW)).toBe('November 11th 2024');
    });
  });

  test('future timestamps use the long form rather than negative relative time', () => {
    expect(formatLinkDate(new Date(NOW + HOUR).toISOString(), NOW)).toBe('August 26th 2026');
  });

  test('unparseable input returns an empty string', () => {
    expect(formatLinkDate('not a date', NOW)).toBe('');
    expect(formatLinkDate(undefined, NOW)).toBe('');
  });
});
