import { describe, expect, it } from 'vitest';
import { extractStateFromAddress, timezoneFromAddress } from '../utils/timezones';

describe('timezones utilities', () => {
  it('derives timezone from a US address with state code and zip', () => {
    expect(timezoneFromAddress('4725 Lighthouse Drive, Wind Point, WI 53402')).toBe('America/Chicago');
    expect(extractStateFromAddress('4725 Lighthouse Drive, Wind Point, WI 53402')).toBe('WI');
  });

  it('derives timezone from a US address with WA state code', () => {
    expect(timezoneFromAddress('123 Pike St, Seattle, WA 98101, USA')).toBe('America/Los_Angeles');
    expect(extractStateFromAddress('123 Pike St, Seattle, WA 98101, USA')).toBe('WA');
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

  it('derives timezone from an Australian NT address', () => {
    expect(timezoneFromAddress('Smith Street, Darwin NT 0800, Australia')).toBe('Australia/Darwin');
    expect(extractStateFromAddress('Smith Street, Darwin NT 0800, Australia')).toBe('NT');
  });

  it('derives timezone from an Australian WA address', () => {
    expect(timezoneFromAddress('Mill Street, Perth WA 6000, Australia')).toBe('Australia/Perth');
    expect(extractStateFromAddress('Mill Street, Perth WA 6000, Australia')).toBe('WA');
  });

  it('falls back to the default timezone when no location can be inferred', () => {
    expect(timezoneFromAddress('Somewhere over the rainbow')).toBe('America/Chicago');
  });

  it('does not misidentify "Maui" as Australia (false-positive "au" substring)', () => {
    expect(timezoneFromAddress('100 Hana Hwy, Maui, HI 96732, USA')).toBe('Pacific/Honolulu');
  });

  it('does not misidentify "Austin" as Australia (false-positive "au" substring)', () => {
    expect(timezoneFromAddress('1 Congress Ave, Austin, TX 78701, USA')).toBe('America/Chicago');
  });

  it('does not misidentify a US address with CA state code as Canada when "USA" is present', () => {
    expect(timezoneFromAddress('100 Main St, Los Angeles, CA 90001, USA')).toBe('America/Los_Angeles');
  });
});