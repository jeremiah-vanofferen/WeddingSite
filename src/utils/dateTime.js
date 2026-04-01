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
