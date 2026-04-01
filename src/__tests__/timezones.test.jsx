import { describe, expect, it } from 'vitest';
import { extractStateFromAddress, timezoneFromAddress } from '../utils/timezones';

describe('timezones utilities', () => {
  it('derives timezone from a US address with state code and zip', () => {
    expect(timezoneFromAddress('4725 Lighthouse Drive, Wind Point, WI 53402')).toBe('America/Chicago');
    expect(extractStateFromAddress('4725 Lighthouse Drive, Wind Point, WI 53402')).toBe('WI');
  });

  it('derives timezone from a Canadian address with province code', () => {
    expect(timezoneFromAddress('100 Queen St W, Toronto, ON M5H 2N2, Canada')).toBe('America/Toronto');
    expect(extractStateFromAddress('100 Queen St W, Toronto, ON M5H 2N2, Canada')).toBe('ON');
  });

  it('derives timezone from a UK address with country name', () => {
    expect(timezoneFromAddress('10 Downing Street, London SW1A 2AA, United Kingdom')).toBe('Europe/London');
  });

  it('derives timezone from an Australian address with state abbreviation', () => {
    expect(timezoneFromAddress('1 Macquarie St, Sydney NSW 2000, Australia')).toBe('Australia/Sydney');
    expect(extractStateFromAddress('1 Macquarie St, Sydney NSW 2000, Australia')).toBe('NSW');
  });

  it('falls back to the default timezone when no location can be inferred', () => {
    expect(timezoneFromAddress('Somewhere over the rainbow')).toBe('America/Chicago');
  });
});