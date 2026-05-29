import { describe, it, expect } from 'vitest';
import { parseAresResponse, extractAddress } from './ares';

const mockAresResponse = {
  ico: '02823519',
  obchodniJmeno: 'ideabox s.r.o.',
  pravniForma: { kod: '112', nazev: 'Společnost s ručením omezeným' },
  datumVzniku: '2014-03-12T00:00:00+01:00',
  stavSubjektu: { kod: 'AKTIVNI', nazev: 'Aktivní' },
  sidlo: { textovaAdresa: 'Náměstí Míru 796, Praha 2, 120 00' },
  dic: 'CZ02823519',
};

describe('parseAresResponse', () => {
  it('extracts all fields correctly', () => {
    const result = parseAresResponse(mockAresResponse);
    expect(result.ico).toBe('02823519');
    expect(result.obchodniJmeno).toBe('ideabox s.r.o.');
    expect(result.pravniForma).toBe('Společnost s ručením omezeným');
    expect(result.stavSubjektu).toBe('Aktivní');
    expect(result.dic).toBe('CZ02823519');
    expect(result.datumVzniku).toBe('2014-03-12');
    expect(result.adresa).toBe('Náměstí Míru 796, Praha 2, 120 00');
  });

  it('handles string pravniForma (older API format)', () => {
    const result = parseAresResponse({ ...mockAresResponse, pravniForma: '112' });
    expect(result.pravniForma).toBe('112');
  });

  it('handles missing dic', () => {
    const result = parseAresResponse({ ...mockAresResponse, dic: undefined });
    expect(result.dic).toBeUndefined();
  });
});

describe('extractAddress', () => {
  it('returns textovaAdresa when available', () => {
    expect(extractAddress({ textovaAdresa: 'Some Street 1, Praha' })).toBe('Some Street 1, Praha');
  });
  it('builds address from parts when textovaAdresa missing', () => {
    const addr = extractAddress({
      nazevUlice: 'Wenceslas Square',
      cisloDomovni: '1',
      nazevObce: 'Praha',
      psc: 11000,
    });
    expect(addr).toContain('Praha');
  });
});
