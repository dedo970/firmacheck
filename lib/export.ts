import type { SavedCompany } from '@/types';

const CSV_HEADERS = [
  'ico',
  'nazev',
  'pravni_forma',
  'stav',
  'adresa',
  'datum_vzniku',
  'datum_overeni',
  'zdroj',
  'lat',
  'lng',
];

const FORMULA_PREFIXES = /^[=+\-@\t\r]/;

function escapeCSV(value: string | number | undefined): string {
  const str = value === undefined || value === null ? '' : String(value);
  // Prepend ' to prevent spreadsheet formula injection (= + - @ tab carriage-return)
  const safe = FORMULA_PREFIXES.test(str) ? `'${str}` : str;
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function toCSV(companies: SavedCompany[]): string {
  if (companies.length === 0) return '';

  const header = CSV_HEADERS.join(',');
  const rows = companies.map((c) =>
    [
      c.ico,
      c.obchodniJmeno,
      c.pravniForma,
      c.stavSubjektu,
      c.adresa,
      c.datumVzniku,
      new Date(c.lastVerifiedAt).toISOString(),
      c.source,
      c.lat ?? '',
      c.lng ?? '',
    ]
      .map(escapeCSV)
      .join(','),
  );

  // BOM for correct Czech character display in Excel; CRLF per RFC 4180
  return '﻿' + [header, ...rows].join('\r\n');
}

export function toJSON(companies: SavedCompany[]): string {
  return JSON.stringify(companies, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  try {
    document.body.appendChild(a);
    a.click();
  } finally {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
