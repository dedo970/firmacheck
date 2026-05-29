import { describe, it, expect } from 'vitest';
import { toCSV, toJSON } from './export';
import type { SavedCompany } from '@/types';

const companies: SavedCompany[] = [
  {
    ico: '02823519',
    obchodniJmeno: 'ideabox s.r.o.',
    pravniForma: 'Společnost s ručením omezeným',
    stavSubjektu: 'Aktivní',
    adresa: 'Náměstí Míru 796, Praha 2, 120 00',
    datumVzniku: '2014-03-12',
    dic: 'CZ02823519',
    lat: 50.0754,
    lng: 14.4322,
    savedAt: 1700000000000,
    lastVerifiedAt: 1700000000000,
    source: 'api',
  },
];

describe('toCSV', () => {
  it('returns empty string for empty array', () => {
    expect(toCSV([])).toBe('');
  });
  it('includes CSV header', () => {
    const csv = toCSV(companies);
    expect(csv).toContain('ico,nazev');
  });
  it('includes company data', () => {
    const csv = toCSV(companies);
    expect(csv).toContain('02823519');
    expect(csv).toContain('ideabox s.r.o.');
  });
  it('wraps fields with commas in quotes', () => {
    const csv = toCSV(companies);
    expect(csv).toContain('"Náměstí Míru 796, Praha 2, 120 00"');
  });
});

describe('toJSON', () => {
  it('returns valid JSON array', () => {
    const json = toJSON(companies);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].ico).toBe('02823519');
  });
});
