// Copyright 2026 Jeremiah Van Offeren
import { describe, it, expect } from 'vitest';
import {
  resolveTimeZone,
  formatWeddingDate,
  formatTimeOfDay,
  formatIsoDate,
  formatIsoDateTime,
  getTimeZoneLabel,
  dateTimeToUTC,
} from '../utils/dateTime';
import { DEFAULT_WEDDING_TIME_ZONE } from '../utils/constants';

describe('resolveTimeZone', () => {
  it('returns the default timezone for null', () => {
    expect(resolveTimeZone(null)).toBe(DEFAULT_WEDDING_TIME_ZONE);
  });

  it('returns the default timezone for undefined', () => {
    expect(resolveTimeZone(undefined)).toBe(DEFAULT_WEDDING_TIME_ZONE);
  });

  it('returns the default timezone for an unrecognised timezone string', () => {
    expect(resolveTimeZone('Not/A/RealZone')).toBe(DEFAULT_WEDDING_TIME_ZONE);
  });

  it('returns a valid timezone unchanged', () => {
    expect(resolveTimeZone('America/New_York')).toBe('America/New_York');
    expect(resolveTimeZone('Europe/Paris')).toBe('Europe/Paris');
  });
});

describe('formatWeddingDate', () => {
  it('returns empty string for null', () => {
    expect(formatWeddingDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatWeddingDate(undefined)).toBe('');
  });

  it('returns the original string when it contains no dash', () => {
    expect(formatWeddingDate('notadate')).toBe('notadate');
  });

  it('returns the original string when year/month/day parse to zero', () => {
    expect(formatWeddingDate('0-0-0')).toBe('0-0-0');
  });

  it('returns a formatted date string for a valid YYYY-MM-DD input', () => {
    const result = formatWeddingDate('2026-06-15');
    expect(result).toMatch(/June/);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/15/);
  });
});

describe('formatTimeOfDay', () => {
  it('returns empty string for null', () => {
    expect(formatTimeOfDay(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatTimeOfDay(undefined)).toBe('');
  });

  it('returns the original string when it contains no colon', () => {
    expect(formatTimeOfDay('1400')).toBe('1400');
  });

  it('returns the original string when parts are not valid integers', () => {
    expect(formatTimeOfDay('ab:cd')).toBe('ab:cd');
  });

  it('formats a valid HH:MM string to 12-hour time', () => {
    const result = formatTimeOfDay('14:00');
    expect(result).toMatch(/2:00/);
    expect(result).toMatch(/PM/i);
  });

  it('formats midnight correctly', () => {
    const result = formatTimeOfDay('00:00');
    expect(result).toMatch(/12:00/);
    expect(result).toMatch(/AM/i);
  });
});

describe('formatIsoDate', () => {
  it('returns empty string for empty string input', () => {
    expect(formatIsoDate('')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(formatIsoDate(null)).toBe('');
  });

  it('returns empty string for an unparseable ISO string', () => {
    expect(formatIsoDate('definitely-not-a-date')).toBe('');
  });

  it('returns a formatted date string for a valid ISO date', () => {
    const result = formatIsoDate('2026-06-15T12:00:00.000Z', 'en-US', 'UTC');
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });
});

describe('formatIsoDateTime', () => {
  it('returns empty string for empty string input', () => {
    expect(formatIsoDateTime('')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(formatIsoDateTime(null)).toBe('');
  });

  it('returns empty string for an unparseable string', () => {
    expect(formatIsoDateTime('not-valid')).toBe('');
  });

  it('returns a formatted datetime string for a valid ISO string', () => {
    const result = formatIsoDateTime('2026-06-15T14:30:00.000Z', 'en-US', 'UTC');
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });

  it('treats a timezone passed as the second argument as a timezone fallback', () => {
    const result = formatIsoDateTime('2026-06-15T14:30:00.000Z', 'America/Chicago');
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });
});

describe('getTimeZoneLabel', () => {
  it('returns an abbreviated timezone label for a valid timezone', () => {
    const label = getTimeZoneLabel('America/Chicago');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('falls back gracefully for an invalid timezone string', () => {
    const label = getTimeZoneLabel('Fake/Zone');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('uses a reference date when dateString is provided', () => {
    const label = getTimeZoneLabel('America/Chicago', 'en-US', '2026-06-15');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });
});

describe('dateTimeToUTC', () => {
  it('returns null when dateString is not a string', () => {
    expect(dateTimeToUTC(null, '14:00', 'America/Chicago')).toBeNull();
    expect(dateTimeToUTC(123, '14:00', 'America/Chicago')).toBeNull();
  });

  it('returns null when dateString contains no dash', () => {
    expect(dateTimeToUTC('20260615', '14:00', 'America/Chicago')).toBeNull();
  });

  it('returns null when date parts parse to zero', () => {
    expect(dateTimeToUTC('0-0-0', '14:00', 'America/Chicago')).toBeNull();
  });

  it('returns null when timeString is not a string', () => {
    expect(dateTimeToUTC('2026-06-15', null, 'America/Chicago')).toBeNull();
    expect(dateTimeToUTC('2026-06-15', 1400, 'America/Chicago')).toBeNull();
  });

  it('returns null when timeString contains no colon', () => {
    expect(dateTimeToUTC('2026-06-15', '1400', 'America/Chicago')).toBeNull();
  });

  it('returns null when time parts are not valid integers', () => {
    expect(dateTimeToUTC('2026-06-15', 'ab:cd', 'America/Chicago')).toBeNull();
  });

  it('returns a finite UTC timestamp for valid date, time and timezone', () => {
    const result = dateTimeToUTC('2026-06-15', '14:00', 'America/Chicago');
    expect(typeof result).toBe('number');
    expect(Number.isFinite(result)).toBe(true);
  });

  it('falls back to the default timezone when an invalid timezone is given', () => {
    const resultDefault = dateTimeToUTC('2026-06-15', '14:00', DEFAULT_WEDDING_TIME_ZONE);
    const resultFallback = dateTimeToUTC('2026-06-15', '14:00', 'Bogus/Zone');
    expect(resultDefault).toBe(resultFallback);
  });
});
