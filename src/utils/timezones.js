import { DEFAULT_WEDDING_TIME_ZONE } from './constants';

const REGION_CODE_TIMEZONES = {
  AL: 'America/Chicago',
  AK: 'America/Anchorage',
  AZ: 'America/Phoenix',
  AR: 'America/Chicago',
  CA: 'America/Los_Angeles',
  CO: 'America/Denver',
  CT: 'America/New_York',
  DC: 'America/New_York',
  DE: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  HI: 'Pacific/Honolulu',
  IA: 'America/Chicago',
  ID: 'America/Denver',
  IL: 'America/Chicago',
  IN: 'America/Indiana/Indianapolis',
  KS: 'America/Chicago',
  KY: 'America/New_York',
  LA: 'America/Chicago',
  MA: 'America/New_York',
  MD: 'America/New_York',
  ME: 'America/New_York',
  MI: 'America/Detroit',
  MN: 'America/Chicago',
  MO: 'America/Chicago',
  MS: 'America/Chicago',
  MT: 'America/Denver',
  NC: 'America/New_York',
  ND: 'America/Chicago',
  NE: 'America/Chicago',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NM: 'America/Denver',
  NV: 'America/Los_Angeles',
  NY: 'America/New_York',
  OH: 'America/New_York',
  OK: 'America/Chicago',
  OR: 'America/Los_Angeles',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  SD: 'America/Chicago',
  TN: 'America/Chicago',
  TX: 'America/Chicago',
  UT: 'America/Denver',
  VA: 'America/New_York',
  VT: 'America/New_York',
  WA: 'America/Los_Angeles',
  WI: 'America/Chicago',
  WV: 'America/New_York',
  WY: 'America/Denver',
  AB: 'America/Edmonton',
  BC: 'America/Vancouver',
  MB: 'America/Winnipeg',
  NB: 'America/Moncton',
  NL: 'America/St_Johns',
  NS: 'America/Halifax',
  NT: 'America/Yellowknife',
  NU: 'America/Iqaluit',
  ON: 'America/Toronto',
  PE: 'America/Halifax',
  QC: 'America/Toronto',
  SK: 'America/Regina',
  YT: 'America/Whitehorse',
  ACT: 'Australia/Sydney',
  NSW: 'Australia/Sydney',
  QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide',
  TAS: 'Australia/Hobart',
  VIC: 'Australia/Melbourne',
};

const REGION_NAME_TIMEZONES = {
  'alabama': 'America/Chicago',
  'alaska': 'America/Anchorage',
  'alberta': 'America/Edmonton',
  'arizona': 'America/Phoenix',
  'arkansas': 'America/Chicago',
  'australian capital territory': 'Australia/Sydney',
  'british columbia': 'America/Vancouver',
  'california': 'America/Los_Angeles',
  'colorado': 'America/Denver',
  'connecticut': 'America/New_York',
  'delaware': 'America/New_York',
  'district of columbia': 'America/New_York',
  'florida': 'America/New_York',
  'georgia': 'America/New_York',
  'hawaii': 'Pacific/Honolulu',
  'idaho': 'America/Denver',
  'illinois': 'America/Chicago',
  'indiana': 'America/Indiana/Indianapolis',
  'iowa': 'America/Chicago',
  'kansas': 'America/Chicago',
  'kentucky': 'America/New_York',
  'louisiana': 'America/Chicago',
  'maine': 'America/New_York',
  'manitoba': 'America/Winnipeg',
  'maryland': 'America/New_York',
  'massachusetts': 'America/New_York',
  'michigan': 'America/Detroit',
  'minnesota': 'America/Chicago',
  'mississippi': 'America/Chicago',
  'missouri': 'America/Chicago',
  'montana': 'America/Denver',
  'nebraska': 'America/Chicago',
  'nevada': 'America/Los_Angeles',
  'new brunswick': 'America/Moncton',
  'new hampshire': 'America/New_York',
  'new jersey': 'America/New_York',
  'new mexico': 'America/Denver',
  'new south wales': 'Australia/Sydney',
  'new york': 'America/New_York',
  'newfoundland and labrador': 'America/St_Johns',
  'north carolina': 'America/New_York',
  'north dakota': 'America/Chicago',
  'northern territory': 'Australia/Darwin',
  'northwest territories': 'America/Yellowknife',
  'nova scotia': 'America/Halifax',
  'nunavut': 'America/Iqaluit',
  'ohio': 'America/New_York',
  'oklahoma': 'America/Chicago',
  'ontario': 'America/Toronto',
  'oregon': 'America/Los_Angeles',
  'pennsylvania': 'America/New_York',
  'prince edward island': 'America/Halifax',
  'quebec': 'America/Toronto',
  'queensland': 'Australia/Brisbane',
  'rhode island': 'America/New_York',
  'saskatchewan': 'America/Regina',
  'south australia': 'Australia/Adelaide',
  'south carolina': 'America/New_York',
  'south dakota': 'America/Chicago',
  'tasmania': 'Australia/Hobart',
  'tennessee': 'America/Chicago',
  'texas': 'America/Chicago',
  'utah': 'America/Denver',
  'vermont': 'America/New_York',
  'victoria': 'Australia/Melbourne',
  'virginia': 'America/New_York',
  'washington': 'America/Los_Angeles',
  'west virginia': 'America/New_York',
  'western australia': 'Australia/Perth',
  'wisconsin': 'America/Chicago',
  'wyoming': 'America/Denver',
  'yukon': 'America/Whitehorse',
};

const COUNTRY_TIMEZONES = {
  'argentina': 'America/Buenos_Aires',
  'australia': 'Australia/Sydney',
  'austria': 'Europe/Vienna',
  'belgium': 'Europe/Brussels',
  'brazil': 'America/Sao_Paulo',
  'canada': 'America/Toronto',
  'china': 'Asia/Shanghai',
  'france': 'Europe/Paris',
  'germany': 'Europe/Berlin',
  'india': 'Asia/Kolkata',
  'ireland': 'Europe/Dublin',
  'italy': 'Europe/Rome',
  'japan': 'Asia/Tokyo',
  'mexico': 'America/Mexico_City',
  'netherlands': 'Europe/Amsterdam',
  'new zealand': 'Pacific/Auckland',
  'nz': 'Pacific/Auckland',
  'portugal': 'Europe/Lisbon',
  'singapore': 'Asia/Singapore',
  'spain': 'Europe/Madrid',
  'switzerland': 'Europe/Zurich',
  'thailand': 'Asia/Bangkok',
  'uae': 'Asia/Dubai',
  'uk': 'Europe/London',
  'united arab emirates': 'Asia/Dubai',
  'united kingdom': 'Europe/London',
  'united states': DEFAULT_WEDDING_TIME_ZONE,
  'usa': DEFAULT_WEDDING_TIME_ZONE,
};

export const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Buenos_Aires',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/Dublin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Zurich',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Brisbane',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
];

function normalizeSegment(value) {
  return value
    .toLowerCase()
    .replace(/[.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitAddress(address) {
  return address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function findRegionCode(segment) {
  const upperSegment = segment.toUpperCase();

  for (const [code, timeZone] of Object.entries(REGION_CODE_TIMEZONES)) {
    if (new RegExp(`\\b${code}\\b`).test(upperSegment)) {
      return { code, timeZone };
    }
  }

  return null;
}

function findRegionName(segment) {
  const normalizedSegment = normalizeSegment(segment);

  for (const [name, timeZone] of Object.entries(REGION_NAME_TIMEZONES)) {
    if (normalizedSegment.includes(name)) {
      return { name, timeZone };
    }
  }

  return null;
}

function findCountryTimeZone(segments) {
  for (const segment of [...segments].reverse()) {
    const normalizedSegment = normalizeSegment(segment);
    for (const [country, timeZone] of Object.entries(COUNTRY_TIMEZONES)) {
      if (normalizedSegment.includes(country)) {
        return timeZone;
      }
    }
  }

  return null;
}

export function extractStateFromAddress(address) {
  if (!address || typeof address !== 'string') {
    return null;
  }

  const segments = splitAddress(address);
  const candidates = segments.length > 0 ? [...segments].reverse() : [address];

  for (const candidate of candidates) {
    const codeMatch = findRegionCode(candidate);
    if (codeMatch) {
      return codeMatch.code;
    }

    const nameMatch = findRegionName(candidate);
    if (nameMatch) {
      return nameMatch.name;
    }
  }

  return null;
}

export function timezoneFromAddress(address, defaultTimezone = DEFAULT_WEDDING_TIME_ZONE) {
  if (!address || typeof address !== 'string') {
    return defaultTimezone;
  }

  const segments = splitAddress(address);
  const candidates = segments.length > 0 ? [...segments].reverse() : [address];

  for (const candidate of candidates) {
    const codeMatch = findRegionCode(candidate);
    if (codeMatch) {
      return codeMatch.timeZone;
    }

    const nameMatch = findRegionName(candidate);
    if (nameMatch) {
      return nameMatch.timeZone;
    }
  }

  return findCountryTimeZone(segments.length > 0 ? segments : [address]) || defaultTimezone;
}
