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

const COUNTRY_CODES = {
  US: DEFAULT_WEDDING_TIME_ZONE,
  CA: 'America/Toronto',
  GB: 'Europe/London',
  AU: 'Australia/Sydney',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  IT: 'Europe/Rome',
  ES: 'Europe/Madrid',
  NL: 'Europe/Amsterdam',
  CH: 'Europe/Zurich',
  AT: 'Europe/Vienna',
  BE: 'Europe/Brussels',
  PT: 'Europe/Lisbon',
  IE: 'Europe/Dublin',
  SG: 'Asia/Singapore',
  JP: 'Asia/Tokyo',
  CN: 'Asia/Shanghai',
  IN: 'Asia/Kolkata',
  TH: 'Asia/Bangkok',
  AE: 'Asia/Dubai',
  BR: 'America/Sao_Paulo',
  MX: 'America/Mexico_City',
  AR: 'America/Buenos_Aires',
  NZ: 'Pacific/Auckland',
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

// Build a map from region names to region codes by matching timezones
function buildNameToCodeMap() {
  const map = {};
  for (const [name, timezone] of Object.entries(REGION_NAME_TIMEZONES)) {
    for (const [code, codeTimezone] of Object.entries(REGION_CODE_TIMEZONES)) {
      if (codeTimezone === timezone) {
        map[name] = code;
        break;
      }
    }
  }
  return map;
}

// Build a map from country names to country codes by matching timezones
function buildCountryNameToCodeMap() {
  const map = {};
  for (const [name, timezone] of Object.entries(COUNTRY_TIMEZONES)) {
    for (const [code, codeTimezone] of Object.entries(COUNTRY_CODES)) {
      if (codeTimezone === timezone) {
        map[name] = code;
        break;
      }
    }
  }
  return map;
}

const REGION_NAME_TO_CODE = buildNameToCodeMap();
const COUNTRY_NAME_TO_CODE = buildCountryNameToCodeMap();

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

function detectCountryContext(segments) {
  // Check if address contains Australia, Canada, or US indicators.
  // Use word-boundary matching for short country codes to avoid false positives
  // (e.g., "au" in "Maui"/"Austin", "us" in "campus").
  const fullAddress = segments.join(' ').toLowerCase();
  if (fullAddress.includes('australia') || /\bau\b/.test(fullAddress)) {
    return 'AU';
  }
  // Check unambiguous US identifiers before the short "ca" code so that
  // addresses like "Los Angeles, CA, USA" are not misidentified as Canada.
  if (fullAddress.includes('united states') || /\busa\b/.test(fullAddress)) {
    return 'US';
  }
  if (fullAddress.includes('canada') || /\bca\b/.test(fullAddress)) {
    return 'CA';
  }
  if (/\bus\b/.test(fullAddress)) {
    return 'US';
  }
  return null;
}

const AUSTRALIAN_STATE_CODES = {
  NSW: 'Australia/Sydney',
  VIC: 'Australia/Melbourne',
  QLD: 'Australia/Brisbane',
  WA: 'Australia/Perth',
  SA: 'Australia/Adelaide',
  TAS: 'Australia/Hobart',
  ACT: 'Australia/Sydney',
  NT: 'Australia/Darwin',
};

function findRegionCode(segment, countryContext = null) {
  const upperSegment = segment.toUpperCase();

  // If we have Australia context, check Australian codes first
  if (countryContext === 'AU') {
    for (const [code, timeZone] of Object.entries(AUSTRALIAN_STATE_CODES)) {
      if (new RegExp(`\\b${code}\\b`).test(upperSegment)) {
        return { code, timeZone };
      }
    }
    // Don't fall through to global REGION_CODE_TIMEZONES for Australian context
    return null;
  }

  // Standard global region code lookup
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

function findCountryCode(segment) {
  const upperSegment = segment.toUpperCase();

  for (const [code, timeZone] of Object.entries(COUNTRY_CODES)) {
    if (new RegExp(`\\b${code}\\b`).test(upperSegment)) {
      return { code, timeZone };
    }
  }

  return null;
}

function findCountryName(segment) {
  const normalizedSegment = normalizeSegment(segment);

  for (const [name, timeZone] of Object.entries(COUNTRY_TIMEZONES)) {
    if (normalizedSegment.includes(name)) {
      return { name, timeZone };
    }
  }

  return null;
}

export function extractStateFromAddress(address) {
  if (!address || typeof address !== 'string') {
    return null;
  }

  const segments = splitAddress(address);
  const countryContext = detectCountryContext(segments);
  const candidates = segments.length > 0 ? [...segments].reverse() : [address];

  // First pass: prioritize region codes and names
  for (const candidate of candidates) {
    const codeMatch = findRegionCode(candidate, countryContext);
    if (codeMatch) {
      return codeMatch.code;
    }

    const nameMatch = findRegionName(candidate);
    if (nameMatch) {
      const code = REGION_NAME_TO_CODE[nameMatch.name];
      if (code) {
        return code;
      }
    }
  }

  // Second pass: look for country codes and names only if no region found
  for (const candidate of candidates) {
    const countryCodeMatch = findCountryCode(candidate);
    if (countryCodeMatch) {
      return countryCodeMatch.code;
    }

    const countryNameMatch = findCountryName(candidate);
    if (countryNameMatch) {
      const code = COUNTRY_NAME_TO_CODE[countryNameMatch.name];
      if (code) {
        return code;
      }
    }
  }

  return null;
}

export function timezoneFromAddress(address, defaultTimezone = DEFAULT_WEDDING_TIME_ZONE) {
  if (!address || typeof address !== 'string') {
    return defaultTimezone;
  }

  const segments = splitAddress(address);
  const countryContext = detectCountryContext(segments);
  const candidates = segments.length > 0 ? [...segments].reverse() : [address];

  // First pass: prioritize region codes and names
  for (const candidate of candidates) {
    const codeMatch = findRegionCode(candidate, countryContext);
    if (codeMatch) {
      return codeMatch.timeZone;
    }

    const nameMatch = findRegionName(candidate);
    if (nameMatch) {
      return nameMatch.timeZone;
    }
  }

  // Second pass: look for country codes and names only if no region found
  for (const candidate of candidates) {
    const countryCodeMatch = findCountryCode(candidate);
    if (countryCodeMatch) {
      return countryCodeMatch.timeZone;
    }

    const countryNameMatch = findCountryName(candidate);
    if (countryNameMatch) {
      return countryNameMatch.timeZone;
    }
  }

  return defaultTimezone;
}
