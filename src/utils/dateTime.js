// Copyright 2026 Jeremiah Van Offeren
import { DEFAULT_WEDDING_TIME_ZONE } from './constants';

function parseDateString(dateString) {
  if (typeof dateString !== 'string' || !dateString.includes('-')) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map(part => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

export function resolveTimeZone(timeZone) {
  try {
    if (!timeZone) {
      return DEFAULT_WEDDING_TIME_ZONE;
    }

    new Intl.DateTimeFormat(undefined, { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_WEDDING_TIME_ZONE;
  }
}

export function formatWeddingDate(dateString, locale = undefined) {
  const parsedDate = parseDateString(dateString);
  if (!parsedDate) {
    return dateString || '';
  }

  const date = new Date(Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, 12, 0, 0));
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatTimeOfDay(timeString, locale = undefined) {
  if (typeof timeString !== 'string' || !timeString.includes(':')) {
    return timeString || '';
  }

  const [hour, minute] = timeString.split(':').map(part => Number.parseInt(part, 10));
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return timeString;
  }

  const date = new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date);
}

export function formatIsoDate(isoString, locale = undefined, timeZone = undefined) {
  if (!isoString) {
    return '';
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: resolveTimeZone(timeZone),
  }).format(date);
}

export function formatIsoDateTime(isoString, locale = undefined, timeZone = undefined) {
  if (!isoString) {
    return '';
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: resolveTimeZone(timeZone),
  }).format(date);
}

export function getTimeZoneLabel(timeZone, locale = undefined, dateString = undefined) {
  const safeTimeZone = resolveTimeZone(timeZone);
  const parsedDate = parseDateString(dateString);
  const referenceDate = parsedDate
    ? new Date(Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, 12, 0, 0))
    : new Date();

  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: safeTimeZone,
    timeZoneName: 'short',
  });

  const part = formatter.formatToParts(referenceDate).find(piece => piece.type === 'timeZoneName');
  return part?.value || safeTimeZone;
}

export function dateTimeToUTC(dateString, timeString, timeZone) {
  // Parse date (YYYY-MM-DD format)
  if (typeof dateString !== 'string' || !dateString.includes('-')) {
    return null;
  }

  const [y, m, d] = dateString.split('-').map(part => Number.parseInt(part, 10));
  if (!y || !m || !d) {
    return null;
  }

  // Parse time (HH:MM format)
  if (typeof timeString !== 'string' || !timeString.includes(':')) {
    return null;
  }

  const [h, min] = timeString.split(':').map(part => Number.parseInt(part, 10));
  if (!Number.isInteger(h) || !Number.isInteger(min)) {
    return null;
  }

  const resolvedTz = resolveTimeZone(timeZone);

  // Create a UTC guess for the intended local time
  const utcGuess = Date.UTC(y, m - 1, d, h, min, 0);

  // Get what local time this UTC guess corresponds to in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: resolvedTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(new Date(utcGuess));
  const get = type => Number(parts.find(p => p.type === type)?.value ?? 0);
  const localInTzAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));

  // Calculate the actual UTC time by accounting for the timezone offset
  return utcGuess + (utcGuess - localInTzAsUtc);
}
