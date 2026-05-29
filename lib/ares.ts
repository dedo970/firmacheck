import type { AresCompany } from '@/types';

type RawSidlo = {
  textovaAdresa?: string;
  nazevUlice?: string;
  cisloDomovni?: string | number;
  cisloOrientacni?: string | number;
  nazevObce?: string;
  psc?: number | string;
  [key: string]: unknown;
};

export function extractAddress(sidlo: RawSidlo): string {
  if (sidlo.textovaAdresa) return sidlo.textovaAdresa;

  const parts: string[] = [];
  if (sidlo.nazevUlice) {
    let street = sidlo.nazevUlice as string;
    if (sidlo.cisloDomovni) street += ` ${sidlo.cisloDomovni}`;
    if (sidlo.cisloOrientacni) street += `/${sidlo.cisloOrientacni}`;
    parts.push(street);
  }
  if (sidlo.nazevObce) parts.push(sidlo.nazevObce as string);
  if (sidlo.psc) {
    const pscStr = String(sidlo.psc).replace(/(\d{3})(\d{2})/, '$1 $2');
    parts.push(pscStr);
  }
  return parts.join(', ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAresResponse(raw: any): AresCompany {
  const pravniForma =
    typeof raw.pravniForma === 'object' && raw.pravniForma?.nazev
      ? raw.pravniForma.nazev
      : String(raw.pravniForma ?? '');

  const stavSubjektu =
    typeof raw.stavSubjektu === 'object' && raw.stavSubjektu?.nazev
      ? raw.stavSubjektu.nazev
      : String(raw.stavSubjektu ?? '');

  const datumVzniku = raw.datumVzniku
    ? String(raw.datumVzniku).split('T')[0]
    : '';

  return {
    ico: String(raw.ico ?? ''),
    obchodniJmeno: String(raw.obchodniJmeno ?? ''),
    pravniForma,
    stavSubjektu,
    datumVzniku,
    adresa: raw.sidlo ? extractAddress(raw.sidlo) : '',
    dic: raw.dic ? String(raw.dic) : undefined,
  };
}
