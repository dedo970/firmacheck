# FirmaCheck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 15 web app that verifies Czech companies by IČO via ARES, shows HQ on a Leaflet map, caches results in browser-side sql.js SQLite (IndexedDB), and lets users save/export companies.

**Architecture:** Next.js 15 App Router on Vercel. Two API routes proxy ARES and Nominatim (avoids CORS). All SQLite logic runs in-browser via sql.js WASM, persisted to IndexedDB. Saved companies and cache share the same DB.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, sql.js, idb, Leaflet + react-leaflet, Vitest

---

## File Map

```
app/
  layout.tsx                  Root layout — Inter font, metadata
  page.tsx                    Main page — wires all sections
  globals.css                 Tailwind base + Linear CSS variables
  api/
    ares/route.ts             ARES API proxy (avoids CORS)
    geocode/route.ts          Nominatim geocoding proxy

components/
  search-form.tsx             IČO + optional name inputs + submit
  company-detail.tsx          Full company info card
  name-match-badge.tsx        Exact/partial/no-match badge
  source-badge.tsx            "API" or "SQLite cache" chip
  company-map.tsx             Leaflet map (dynamic import, no SSR)
  saved-companies.tsx         List + delete + CSV/JSON export
  hero-illustration.tsx       AI-generated SVG empty state

lib/
  sqlite-provider.tsx         React context — sql.js init + IndexedDB sync
  validate-ico.ts             8-digit + checksum validation
  name-match.ts               Name comparison logic
  export.ts                   CSV and JSON export helpers
  ares.ts                     AresCompany type + address extractor
  geocode.ts                  GeoPoint type + address formatter

types/index.ts                Shared TypeScript types

public/
  sql-wasm.wasm               Copied from sql.js dist (postinstall)
  hero.svg                    AI-generated hero illustration

README.md
next.config.ts
vitest.config.ts
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `app/globals.css`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd "/Users/kubik/Github Projects/FirmaCheck"
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-git \
  --yes
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install sql.js idb leaflet react-leaflet
npm install --save-dev @types/sql.js @types/leaflet vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init --yes --defaults
npx shadcn@latest add button input card badge separator
```

- [ ] **Step 4: Add postinstall script and copy WASM**

In `package.json`, inside `"scripts"`:
```json
"postinstall": "cp node_modules/sql.js/dist/sql-wasm.wasm public/sql-wasm.wasm",
```

Then run immediately:
```bash
cp node_modules/sql.js/dist/sql-wasm.wasm public/sql-wasm.wasm
```

- [ ] **Step 5: Configure next.config.ts**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 6: Configure vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 7: Add test script to package.json**

In `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
```

- [ ] **Step 8: Set up Linear-style globals**

Replace `app/globals.css` content:
```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --surface: #f7f7f7;
  --border: #e5e5e5;
  --foreground: #0f0f0f;
  --muted: #6b6b6b;
  --accent: #5b5bd6;
  --accent-hover: #4a4abf;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --radius: 6px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0f0f0f;
    --surface: #1a1a1a;
    --border: #2e2e2e;
    --foreground: #ededed;
    --muted: #8a8a8a;
  }
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; }
```

- [ ] **Step 9: Update app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'FirmaCheck — Ověření české firmy',
  description: 'Rychlé ověření základních údajů o české firmě podle IČO přes ARES.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000, no errors.

- [ ] **Step 11: Commit**

```bash
git init
git add -A
git commit -m "feat: bootstrap Next.js 15 project with Tailwind, shadcn, sql.js, Leaflet"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Create types file**

```ts
// types/index.ts

export interface AresCompany {
  ico: string;
  obchodniJmeno: string;
  pravniForma: string;
  datumVzniku: string;
  stavSubjektu: string;
  adresa: string;
  dic?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type DataSource = 'api' | 'cache';

export interface CompanyResult {
  company: AresCompany;
  aresSource: DataSource;
  geo?: GeoPoint;
  geoSource?: DataSource;
}

export interface SavedCompany {
  ico: string;
  obchodniJmeno: string;
  pravniForma: string;
  stavSubjektu: string;
  adresa: string;
  datumVzniku: string;
  dic?: string;
  lat?: number;
  lng?: number;
  savedAt: number;
  lastVerifiedAt: number;
  source: DataSource;
}

export type NameMatchResult = 'exact' | 'partial' | 'none';
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: IČO Validation

**Files:**
- Create: `lib/validate-ico.ts`
- Create: `lib/validate-ico.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/validate-ico.test.ts
import { describe, it, expect } from 'vitest';
import { validateIco, normalizeIco } from './validate-ico';

describe('normalizeIco', () => {
  it('left-pads short IČO with zeros', () => {
    expect(normalizeIco('1234567')).toBe('01234567');
  });
  it('leaves 8-digit IČO unchanged', () => {
    expect(normalizeIco('02823519')).toBe('02823519');
  });
});

describe('validateIco', () => {
  it('accepts valid IČO 02823519', () => {
    expect(validateIco('02823519')).toBe(true);
  });
  it('accepts valid IČO with leading zero padding', () => {
    expect(validateIco('2823519')).toBe(true);
  });
  it('rejects non-numeric input', () => {
    expect(validateIco('abcd1234')).toBe(false);
  });
  it('rejects IČO longer than 8 digits', () => {
    expect(validateIco('123456789')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(validateIco('')).toBe(false);
  });
  it('rejects IČO with invalid checksum', () => {
    expect(validateIco('12345678')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/validate-ico.test.ts
```

Expected: FAIL — `validateIco` not found.

- [ ] **Step 3: Implement validate-ico.ts**

```ts
// lib/validate-ico.ts

export function normalizeIco(ico: string): string {
  return ico.trim().padStart(8, '0');
}

export function validateIco(ico: string): boolean {
  const normalized = normalizeIco(ico);
  if (!/^\d{8}$/.test(normalized)) return false;

  const digits = normalized.split('').map(Number);
  const weights = [8, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  const remainder = sum % 11;

  let expectedChecksum: number;
  if (remainder === 0) expectedChecksum = 1;
  else if (remainder === 1) expectedChecksum = 0;
  else expectedChecksum = 11 - remainder;

  return digits[7] === expectedChecksum;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lib/validate-ico.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validate-ico.ts lib/validate-ico.test.ts
git commit -m "feat: add IČO validation with checksum (tests green)"
```

---

## Task 4: Name Match Logic

**Files:**
- Create: `lib/name-match.ts`
- Create: `lib/name-match.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/name-match.test.ts
import { describe, it, expect } from 'vitest';
import { matchNames } from './name-match';

describe('matchNames', () => {
  it('returns exact for identical names', () => {
    expect(matchNames('ideabox s.r.o.', 'ideabox s.r.o.')).toBe('exact');
  });
  it('returns exact ignoring case', () => {
    expect(matchNames('Ideabox', 'IDEABOX S.R.O.')).toBe('exact');
  });
  it('returns partial when input is substring of ARES name', () => {
    expect(matchNames('ideabox', 'ideabox s.r.o.')).toBe('partial');
  });
  it('returns partial when ARES name contains input word', () => {
    expect(matchNames('novak', 'Novák a synové s.r.o.')).toBe('partial');
  });
  it('returns none for completely different names', () => {
    expect(matchNames('coca cola', 'ideabox s.r.o.')).toBe('none');
  });
  it('returns exact when empty input (no name provided)', () => {
    expect(matchNames('', 'anything')).toBe('exact');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/name-match.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement name-match.ts**

```ts
// lib/name-match.ts
import type { NameMatchResult } from '@/types';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[.,\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchNames(input: string, aresName: string): NameMatchResult {
  if (!input.trim()) return 'exact';

  const normInput = normalize(input);
  const normAres = normalize(aresName);

  if (normInput === normAres) return 'exact';
  if (normAres.includes(normInput) || normInput.includes(normAres)) return 'partial';

  // word-level partial: any input word found in ares name
  const inputWords = normInput.split(' ').filter(Boolean);
  if (inputWords.some((word) => normAres.includes(word))) return 'partial';

  return 'none';
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lib/name-match.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/name-match.ts lib/name-match.test.ts
git commit -m "feat: add name match logic with diacritics normalization (tests green)"
```

---

## Task 5: ARES Data Helpers

**Files:**
- Create: `lib/ares.ts`
- Create: `lib/ares.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/ares.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/ares.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement lib/ares.ts**

```ts
// lib/ares.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lib/ares.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ares.ts lib/ares.test.ts
git commit -m "feat: add ARES response parser with address extraction (tests green)"
```

---

## Task 6: CSV/JSON Export

**Files:**
- Create: `lib/export.ts`
- Create: `lib/export.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/export.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/export.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement lib/export.ts**

```ts
// lib/export.ts
import type { SavedCompany } from '@/types';

const CSV_HEADERS = [
  'ico', 'nazev', 'pravni_forma', 'stav', 'adresa',
  'datum_vzniku', 'datum_overeni', 'zdroj', 'lat', 'lng',
];

function escapeCSV(value: string | number | undefined): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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
      .join(',')
  );

  return [header, ...rows].join('\n');
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
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lib/export.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/export.ts lib/export.test.ts
git commit -m "feat: add CSV/JSON export helpers (tests green)"
```

---

## Task 7: ARES API Route

**Files:**
- Create: `app/api/ares/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/ares/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty';

export async function GET(request: NextRequest) {
  const ico = request.nextUrl.searchParams.get('ico');
  if (!ico || !/^\d{1,8}$/.test(ico)) {
    return NextResponse.json({ error: 'Neplatné IČO' }, { status: 400 });
  }

  const paddedIco = ico.padStart(8, '0');

  try {
    const res = await fetch(`${ARES_BASE}/${paddedIco}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });

    if (res.status === 404) {
      return NextResponse.json({ error: 'Firma nebyla nalezena' }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Chyba ARES API' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Nepodařilo se spojit s ARES' }, { status: 503 });
  }
}
```

- [ ] **Step 2: Manually verify against real ARES API**

In a browser or curl:
```bash
curl "http://localhost:3000/api/ares?ico=02823519"
```

Expected: JSON with `obchodniJmeno` containing "ideabox".

- [ ] **Step 3: Commit**

```bash
git add app/api/ares/route.ts
git commit -m "feat: add ARES API proxy route"
```

---

## Task 8: Geocoding API Route

**Files:**
- Create: `app/api/geocode/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Chybí adresa' }, { status: 400 });
  }

  try {
    const url = new URL(NOMINATIM);
    url.searchParams.set('q', `${address}, Česká republika`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'cz');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'FirmaCheck/1.0 (https://github.com/kubik/firmacheck)',
        'Accept-Language': 'cs',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding selhal' }, { status: 502 });
    }

    const results = await res.json();
    if (!results.length) {
      return NextResponse.json({ error: 'Adresa nenalezena' }, { status: 404 });
    }

    const { lat, lon } = results[0];
    return NextResponse.json({ lat: parseFloat(lat), lng: parseFloat(lon) });
  } catch {
    return NextResponse.json({ error: 'Geocoding nedostupný' }, { status: 503 });
  }
}
```

- [ ] **Step 2: Manually verify**

```bash
curl "http://localhost:3000/api/geocode?address=N%C3%A1m%C4%9Bst%C3%AD+M%C3%ADru+796%2C+Praha+2"
```

Expected: `{"lat": 50.07..., "lng": 14.43...}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/geocode/route.ts
git commit -m "feat: add Nominatim geocoding proxy route"
```

---

## Task 9: SQLite Provider

**Files:**
- Create: `lib/sqlite-provider.tsx`

- [ ] **Step 1: Create provider**

```tsx
// lib/sqlite-provider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Database } from 'sql.js';
import { openDB, type IDBPDatabase } from 'idb';
import type { AresCompany, DataSource, GeoPoint, SavedCompany } from '@/types';

const IDB_DB_NAME = 'firmacheck-v1';
const IDB_STORE = 'sqlitedb';
const IDB_KEY = 'main';

const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS ares_cache (
    ico TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'api',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS geocode_cache (
    address TEXT PRIMARY KEY,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS saved_companies (
    ico TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    saved_at INTEGER NOT NULL,
    last_verified_at INTEGER NOT NULL,
    source TEXT NOT NULL
  );
`;

interface SQLiteContextValue {
  ready: boolean;
  getAresCache: (ico: string) => AresCompany | null;
  setAresCache: (ico: string, company: AresCompany) => void;
  getGeocodeCache: (address: string) => GeoPoint | null;
  setGeocodeCache: (address: string, geo: GeoPoint) => void;
  getSavedCompanies: () => SavedCompany[];
  saveCompany: (company: AresCompany, geo: GeoPoint | undefined, source: DataSource) => void;
  removeCompany: (ico: string) => void;
  isCompanySaved: (ico: string) => boolean;
}

const SQLiteContext = createContext<SQLiteContextValue | null>(null);

export function SQLiteProvider({ children }: { children: React.ReactNode }) {
  const dbRef = useRef<Database | null>(null);
  const idbRef = useRef<IDBPDatabase | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const initSqlJs = (await import('sql.js')).default;
      const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });

      const idb = await openDB(IDB_DB_NAME, 1, {
        upgrade(d) { d.createObjectStore(IDB_STORE); },
      });
      idbRef.current = idb;

      const saved = await idb.get(IDB_STORE, IDB_KEY);
      const db = saved ? new SQL.Database(saved) : new SQL.Database();
      db.run(INIT_SQL);
      dbRef.current = db;

      setReady(true);
    })();
  }, []);

  function persist() {
    if (!dbRef.current || !idbRef.current) return;
    const data = dbRef.current.export();
    idbRef.current.put(IDB_STORE, data, IDB_KEY);
  }

  function getAresCache(ico: string): AresCompany | null {
    if (!dbRef.current) return null;
    const stmt = dbRef.current.prepare('SELECT data FROM ares_cache WHERE ico = :ico');
    const result = stmt.getAsObject({ ':ico': ico });
    stmt.free();
    if (!result.data) return null;
    return JSON.parse(result.data as string) as AresCompany;
  }

  function setAresCache(ico: string, company: AresCompany) {
    if (!dbRef.current) return;
    dbRef.current.run(
      'INSERT OR REPLACE INTO ares_cache (ico, data, source, created_at) VALUES (?, ?, ?, ?)',
      [ico, JSON.stringify(company), 'api', Date.now()]
    );
    persist();
  }

  function getGeocodeCache(address: string): GeoPoint | null {
    if (!dbRef.current) return null;
    const stmt = dbRef.current.prepare('SELECT lat, lng FROM geocode_cache WHERE address = :addr');
    const result = stmt.getAsObject({ ':addr': address });
    stmt.free();
    if (result.lat === undefined) return null;
    return { lat: result.lat as number, lng: result.lng as number };
  }

  function setGeocodeCache(address: string, geo: GeoPoint) {
    if (!dbRef.current) return;
    dbRef.current.run(
      'INSERT OR REPLACE INTO geocode_cache (address, lat, lng, created_at) VALUES (?, ?, ?, ?)',
      [address, geo.lat, geo.lng, Date.now()]
    );
    persist();
  }

  function getSavedCompanies(): SavedCompany[] {
    if (!dbRef.current) return [];
    const stmt = dbRef.current.prepare(
      'SELECT data, saved_at, last_verified_at, source FROM saved_companies ORDER BY saved_at DESC'
    );
    const rows: SavedCompany[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const base = JSON.parse(row.data as string) as AresCompany & { lat?: number; lng?: number };
      rows.push({
        ...base,
        savedAt: row.saved_at as number,
        lastVerifiedAt: row.last_verified_at as number,
        source: row.source as DataSource,
      });
    }
    stmt.free();
    return rows;
  }

  function saveCompany(company: AresCompany, geo: GeoPoint | undefined, source: DataSource) {
    if (!dbRef.current) return;
    const data = JSON.stringify({ ...company, lat: geo?.lat, lng: geo?.lng });
    const now = Date.now();
    dbRef.current.run(
      'INSERT OR REPLACE INTO saved_companies (ico, data, saved_at, last_verified_at, source) VALUES (?, ?, ?, ?, ?)',
      [company.ico, data, now, now, source]
    );
    persist();
  }

  function removeCompany(ico: string) {
    if (!dbRef.current) return;
    dbRef.current.run('DELETE FROM saved_companies WHERE ico = ?', [ico]);
    persist();
  }

  function isCompanySaved(ico: string): boolean {
    if (!dbRef.current) return false;
    const stmt = dbRef.current.prepare('SELECT 1 FROM saved_companies WHERE ico = :ico');
    const result = stmt.getAsObject({ ':ico': ico });
    stmt.free();
    return Object.keys(result).length > 0;
  }

  return (
    <SQLiteContext.Provider value={{
      ready,
      getAresCache, setAresCache,
      getGeocodeCache, setGeocodeCache,
      getSavedCompanies, saveCompany, removeCompany, isCompanySaved,
    }}>
      {children}
    </SQLiteContext.Provider>
  );
}

export function useSQLite(): SQLiteContextValue {
  const ctx = useContext(SQLiteContext);
  if (!ctx) throw new Error('useSQLite must be inside SQLiteProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/sqlite-provider.tsx
git commit -m "feat: add browser-side sql.js SQLite provider with IndexedDB persistence"
```

---

## Task 10: Hero SVG Illustration

**Files:**
- Create: `public/hero.svg`
- Create: `components/hero-illustration.tsx`

- [ ] **Step 1: Create AI-generated hero SVG**

Save to `public/hero.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none">
  <!-- Background subtle grid -->
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E5E5" stroke-width="0.5"/>
    </pattern>
    <linearGradient id="docGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5B5BD6" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#5B5BD6" stop-opacity="0.02"/>
    </linearGradient>
    <linearGradient id="sealGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5B5BD6"/>
      <stop offset="100%" stop-color="#7C7CE8"/>
    </linearGradient>
  </defs>

  <rect width="400" height="300" fill="url(#grid)"/>

  <!-- Document shadow -->
  <rect x="123" y="57" width="154" height="196" rx="8" fill="#0f0f0f" opacity="0.06"/>

  <!-- Main document -->
  <rect x="120" y="54" width="154" height="196" rx="8" fill="white" stroke="#E5E5E5" stroke-width="1.5"/>
  <rect x="120" y="54" width="154" height="196" rx="8" fill="url(#docGrad)"/>

  <!-- Document lines -->
  <rect x="140" y="82" width="80" height="6" rx="3" fill="#E5E5E5"/>
  <rect x="140" y="96" width="114" height="4" rx="2" fill="#F0F0F0"/>
  <rect x="140" y="108" width="100" height="4" rx="2" fill="#F0F0F0"/>
  <rect x="140" y="120" width="110" height="4" rx="2" fill="#F0F0F0"/>

  <!-- Divider -->
  <line x1="140" y1="136" x2="254" y2="136" stroke="#E5E5E5" stroke-width="1"/>

  <!-- Data rows -->
  <rect x="140" y="148" width="50" height="4" rx="2" fill="#E5E5E5"/>
  <rect x="196" y="148" width="70" height="4" rx="2" fill="#F0F0F0"/>
  <rect x="140" y="160" width="40" height="4" rx="2" fill="#E5E5E5"/>
  <rect x="196" y="160" width="60" height="4" rx="2" fill="#F0F0F0"/>
  <rect x="140" y="172" width="55" height="4" rx="2" fill="#E5E5E5"/>
  <rect x="196" y="172" width="80" height="4" rx="2" fill="#F0F0F0"/>
  <rect x="140" y="184" width="45" height="4" rx="2" fill="#E5E5E5"/>
  <rect x="196" y="184" width="65" height="4" rx="2" fill="#F0F0F0"/>

  <!-- Seal circle (outer) -->
  <circle cx="230" cy="210" r="30" fill="url(#sealGrad)" opacity="0.15"/>
  <circle cx="230" cy="210" r="25" fill="none" stroke="#5B5BD6" stroke-width="1.5" stroke-dasharray="4 2"/>

  <!-- Seal checkmark -->
  <circle cx="230" cy="210" r="15" fill="#5B5BD6"/>
  <path d="M222 210 L228 216 L238 204" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Floating badge top-right -->
  <rect x="254" y="54" width="72" height="22" rx="11" fill="#5B5BD6"/>
  <text x="290" y="69" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="white" text-anchor="middle">ARES ✓</text>

  <!-- Small decorative dots -->
  <circle cx="96" cy="90" r="4" fill="#5B5BD6" opacity="0.3"/>
  <circle cx="84" cy="130" r="6" fill="#5B5BD6" opacity="0.15"/>
  <circle cx="318" cy="170" r="5" fill="#5B5BD6" opacity="0.2"/>
  <circle cx="306" cy="220" r="3" fill="#5B5BD6" opacity="0.25"/>
</svg>
```

- [ ] **Step 2: Create hero-illustration.tsx**

```tsx
// components/hero-illustration.tsx
import Image from 'next/image';

export function HeroIllustration() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Image
        src="/hero.svg"
        alt="Ilustrace ověřování firmy"
        width={280}
        height={210}
        priority
      />
      <div className="text-center">
        <p className="text-sm text-[var(--muted)]">
          Zadejte IČO a ověřte firmu v českém rejstříku ARES
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add public/hero.svg components/hero-illustration.tsx
git commit -m "feat: add AI-generated hero SVG illustration"
```

---

## Task 11: UI Badges & Source Indicator

**Files:**
- Create: `components/source-badge.tsx`
- Create: `components/name-match-badge.tsx`

- [ ] **Step 1: Create source-badge.tsx**

```tsx
// components/source-badge.tsx
import type { DataSource } from '@/types';

interface SourceBadgeProps {
  label: string;
  source: DataSource;
}

export function SourceBadge({ label, source }: SourceBadgeProps) {
  const isCache = source === 'cache';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
      {label}:
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono font-medium text-xs ${
          isCache
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        }`}
      >
        {isCache ? 'SQLite cache' : 'API'}
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Create name-match-badge.tsx**

```tsx
// components/name-match-badge.tsx
import type { NameMatchResult } from '@/types';

interface NameMatchBadgeProps {
  result: NameMatchResult;
  input: string;
  aresName: string;
}

const CONFIG = {
  exact: {
    label: 'Shoda',
    icon: '✓',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  partial: {
    label: 'Částečná shoda',
    icon: '~',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  none: {
    label: 'Neshoda',
    icon: '✕',
    className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function NameMatchBadge({ result, input, aresName }: NameMatchBadgeProps) {
  const { label, icon, className } = CONFIG[result];
  const message =
    result === 'exact'
      ? `Zadaný název „${input}" odpovídá firmě „${aresName}"`
      : result === 'partial'
        ? `Zadaný název „${input}" částečně odpovídá firmě „${aresName}"`
        : `Zadaný název „${input}" se liší od názvu uvedeného v ARES`;

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit ${className}`}>
        {icon} {label}
      </span>
      <p className="text-xs text-[var(--muted)]">{message}</p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/source-badge.tsx components/name-match-badge.tsx
git commit -m "feat: add SourceBadge and NameMatchBadge UI components"
```

---

## Task 12: Search Form

**Files:**
- Create: `components/search-form.tsx`

- [ ] **Step 1: Create search-form.tsx**

```tsx
// components/search-form.tsx
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateIco, normalizeIco } from '@/lib/validate-ico';

interface SearchFormProps {
  onSearch: (ico: string, name: string) => void;
  loading: boolean;
}

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [ico, setIco] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = ico.trim();
    if (!validateIco(trimmed)) {
      setError('Zadejte platné IČO (8 číslic).');
      return;
    }
    setError('');
    onSearch(normalizeIco(trimmed), name.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="IČO firmy *"
            value={ico}
            onChange={(e) => { setIco(e.target.value); setError(''); }}
            maxLength={8}
            className="font-mono"
            aria-label="IČO firmy"
          />
          {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
        </div>
        <Input
          type="text"
          placeholder="Název firmy (volitelné)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          aria-label="Název firmy"
        />
        <Button type="submit" disabled={loading} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white sm:w-auto w-full">
          {loading ? 'Načítám…' : 'Ověřit firmu'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/search-form.tsx
git commit -m "feat: add SearchForm component with IČO validation"
```

---

## Task 13: Company Detail Card

**Files:**
- Create: `components/company-detail.tsx`

- [ ] **Step 1: Create company-detail.tsx**

```tsx
// components/company-detail.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SourceBadge } from './source-badge';
import { NameMatchBadge } from './name-match-badge';
import { matchNames } from '@/lib/name-match';
import type { CompanyResult } from '@/types';

interface CompanyDetailProps {
  result: CompanyResult;
  nameQuery: string;
  onSave: () => void;
  isSaved: boolean;
}

function formatDate(isoDate: string): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('cs-CZ');
}

const STATUS_STYLES: Record<string, string> = {
  'Aktivní': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'AKTIVNI': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function CompanyDetail({ result, nameQuery, onSave, isSaved }: CompanyDetailProps) {
  const { company, aresSource, geo, geoSource } = result;
  const nameMatch = nameQuery ? matchNames(nameQuery, company.obchodniJmeno) : null;
  const statusStyle = STATUS_STYLES[company.stavSubjektu] ?? 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <Card className="border-[var(--border)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-xl font-semibold">{company.obchodniJmeno}</CardTitle>
            <p className="text-sm text-[var(--muted)] font-mono mt-0.5">IČO: {company.ico}</p>
          </div>
          <Badge variant="outline" className={`text-xs ${statusStyle}`}>
            ● {company.stavSubjektu}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Data sources */}
        <div className="flex flex-wrap gap-3 p-3 rounded-md bg-[var(--surface)] border border-[var(--border)]">
          <SourceBadge label="ARES data" source={aresSource} />
          {geoSource && <SourceBadge label="Geocoding" source={geoSource} />}
        </div>

        {/* Company fields */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ['Právní forma', company.pravniForma],
            ['Datum vzniku', formatDate(company.datumVzniku)],
            ['Adresa sídla', company.adresa],
            ['DIČ', company.dic ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-[var(--muted)] mb-0.5">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Geo coordinates */}
        {geo && (
          <div className="text-xs text-[var(--muted)]">
            <span className="font-mono">{geo.lat.toFixed(6)}°N, {geo.lng.toFixed(6)}°E</span>
            {' · '}
            <a
              href={`https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lng}&zoom=16`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              Otevřít v mapách ↗
            </a>
          </div>
        )}

        {/* Name match */}
        {nameMatch && nameQuery && (
          <NameMatchBadge result={nameMatch} input={nameQuery} aresName={company.obchodniJmeno} />
        )}

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={isSaved}
          className={`self-start text-sm px-3 py-1.5 rounded-md border transition-colors ${
            isSaved
              ? 'border-[var(--border)] text-[var(--muted)] cursor-default'
              : 'border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'
          }`}
        >
          {isSaved ? '✓ Uloženo' : 'Uložit firmu'}
        </button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/company-detail.tsx
git commit -m "feat: add CompanyDetail card component"
```

---

## Task 14: Leaflet Map

**Files:**
- Create: `components/company-map.tsx`

- [ ] **Step 1: Create company-map.tsx (dynamic, no SSR)**

```tsx
// components/company-map.tsx
'use client';

import dynamic from 'next/dynamic';
import type { GeoPoint } from '@/types';

interface CompanyMapProps {
  geo: GeoPoint;
  companyName: string;
}

const MapInner = dynamic(() => import('./company-map-inner'), { ssr: false, loading: () => (
  <div className="h-64 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-sm text-[var(--muted)]">
    Načítám mapu…
  </div>
)});

export function CompanyMap({ geo, companyName }: CompanyMapProps) {
  return <MapInner geo={geo} companyName={companyName} />;
}
```

- [ ] **Step 2: Create company-map-inner.tsx**

```tsx
// components/company-map-inner.tsx
'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { GeoPoint } from '@/types';

// Fix default marker icons in Next.js
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function RecenterMap({ geo }: { geo: GeoPoint }) {
  const map = useMap();
  useEffect(() => { map.setView([geo.lat, geo.lng], 16); }, [map, geo]);
  return null;
}

interface Props { geo: GeoPoint; companyName: string; }

export default function CompanyMapInner({ geo, companyName }: Props) {
  return (
    <div className="h-64 rounded-lg overflow-hidden border border-[var(--border)]">
      <MapContainer
        center={[geo.lat, geo.lng]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap geo={geo} />
        <Marker position={[geo.lat, geo.lng]}>
          <Popup>{companyName}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/company-map.tsx components/company-map-inner.tsx
git commit -m "feat: add Leaflet map component with dynamic import (no SSR)"
```

---

## Task 15: Saved Companies Panel

**Files:**
- Create: `components/saved-companies.tsx`

- [ ] **Step 1: Create saved-companies.tsx**

```tsx
// components/saved-companies.tsx
'use client';

import { useSQLite } from '@/lib/sqlite-provider';
import { toCSV, toJSON, downloadFile } from '@/lib/export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { AresCompany, GeoPoint } from '@/types';

interface SavedCompaniesProps {
  onSelect: (ico: string) => void;
}

export function SavedCompanies({ onSelect }: SavedCompaniesProps) {
  const { getSavedCompanies, removeCompany, ready } = useSQLite();

  if (!ready) return null;

  const companies = getSavedCompanies();

  if (companies.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--muted)]">
        Zatím nemáte uložené žádné firmy.
      </div>
    );
  }

  function handleExportCSV() {
    downloadFile(toCSV(companies), 'firmacheck-export.csv', 'text/csv;charset=utf-8');
  }

  function handleExportJSON() {
    downloadFile(toJSON(companies), 'firmacheck-export.json', 'application/json');
  }

  function handleCopyJSON() {
    navigator.clipboard.writeText(toJSON(companies));
  }

  return (
    <Card className="border-[var(--border)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold">
            Uložené firmy ({companies.length})
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs h-7">
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON} className="text-xs h-7">
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyJSON} className="text-xs h-7">
              Kopírovat JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-[var(--border)]">
          {companies.map((c) => (
            <li key={c.ico} className="flex items-center justify-between px-6 py-3 hover:bg-[var(--surface)] transition-colors">
              <button className="flex-1 text-left" onClick={() => onSelect(c.ico)}>
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm">{c.obchodniJmeno}</span>
                  <span className="font-mono text-xs text-[var(--muted)]">{c.ico}</span>
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  {c.adresa} · Ověřeno {new Date(c.lastVerifiedAt).toLocaleDateString('cs-CZ')}
                </div>
              </button>
              <button
                onClick={() => removeCompany(c.ico)}
                className="ml-3 text-[var(--muted)] hover:text-[var(--danger)] transition-colors text-sm"
                aria-label="Odebrat firmu"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/saved-companies.tsx
git commit -m "feat: add SavedCompanies panel with CSV/JSON export"
```

---

## Task 16: Main Page — Wire Everything Together

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write app/page.tsx**

```tsx
// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { SQLiteProvider, useSQLite } from '@/lib/sqlite-provider';
import { SearchForm } from '@/components/search-form';
import { CompanyDetail } from '@/components/company-detail';
import { CompanyMap } from '@/components/company-map';
import { SavedCompanies } from '@/components/saved-companies';
import { HeroIllustration } from '@/components/hero-illustration';
import { parseAresResponse } from '@/lib/ares';
import type { CompanyResult } from '@/types';

function FirmaCheckApp() {
  const sqlite = useSQLite();
  const [result, setResult] = useState<CompanyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIco, setActiveIco] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [savedVersion, setSavedVersion] = useState(0);

  async function handleSearch(ico: string, name: string) {
    setLoading(true);
    setError('');
    setResult(null);
    setNameQuery(name);
    setActiveIco(ico);

    try {
      // 1. Check ARES cache
      let company = sqlite.getAresCache(ico);
      let aresSource: 'api' | 'cache' = 'cache';

      if (!company) {
        const res = await fetch(`/api/ares?ico=${ico}`);
        if (res.status === 404) { setError('Firma s tímto IČO nebyla nalezena.'); return; }
        if (!res.ok) { setError('Nepodařilo se načíst data z ARES. Zkuste to znovu.'); return; }
        const raw = await res.json();
        company = parseAresResponse(raw);
        sqlite.setAresCache(ico, company);
        aresSource = 'api';
      }

      // 2. Geocode (cached)
      let geo = sqlite.getGeocodeCache(company.adresa);
      let geoSource: 'api' | 'cache' | undefined;

      if (geo) {
        geoSource = 'cache';
      } else if (company.adresa) {
        const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(company.adresa)}`);
        if (geoRes.ok) {
          geo = await geoRes.json();
          sqlite.setGeocodeCache(company.adresa, geo!);
          geoSource = 'api';
        }
      }

      setResult({ company, aresSource, geo: geo ?? undefined, geoSource });
    } catch {
      setError('Neočekávaná chyba. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!result) return;
    sqlite.saveCompany(result.company, result.geo, result.aresSource);
    setSavedVersion((v) => v + 1);
  }

  function handleSelectSaved(ico: string) {
    setShowSaved(false);
    handleSearch(ico, '');
  }

  const isSaved = result ? sqlite.isCompanySaved(result.company.ico) : false;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border)] sticky top-0 z-50 bg-[var(--background)]/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-semibold text-sm tracking-tight">FirmaCheck</span>
          <button
            onClick={() => setShowSaved((s) => !s)}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Uložené firmy
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ověření firmy</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Zadejte IČO a ověřte firmu v rejstříku ARES.</p>
        </div>

        {/* Search */}
        <SearchForm onSearch={handleSearch} loading={loading} />

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && !showSaved && (
          <HeroIllustration />
        )}

        {/* Results */}
        {result && (
          <>
            <CompanyDetail
              result={result}
              nameQuery={nameQuery}
              onSave={handleSave}
              isSaved={isSaved}
            />
            {result.geo && (
              <CompanyMap geo={result.geo} companyName={result.company.obchodniJmeno} />
            )}
          </>
        )}

        {/* Saved companies panel */}
        {showSaved && (
          <div>
            <h2 className="text-base font-semibold mb-3">Uložené firmy</h2>
            <SavedCompanies key={savedVersion} onSelect={handleSelectSaved} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <SQLiteProvider>
      <FirmaCheckApp />
    </SQLiteProvider>
  );
}
```

- [ ] **Step 2: Run dev server and test golden path**

```bash
npm run dev
```

Open http://localhost:3000.

Test checklist:
- [ ] Type `02823519`, click "Ověřit firmu" → company detail appears with "API" badge
- [ ] Search same IČO again → "SQLite cache" badge appears
- [ ] Map renders with marker on Prague location
- [ ] Click "Uložit firmu" → button changes to "✓ Uloženo"
- [ ] Open "Uložené firmy" → saved company listed
- [ ] Refresh page → saved company still listed (IndexedDB persistence)
- [ ] Type name "ideabox" + same IČO → name match badge shows

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire main page — search, cache, map, saved companies"
```

---

## Task 17: Run All Tests

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests PASS (validate-ico, name-match, ares, export).

- [ ] **Step 2: Fix any failures before proceeding**

---

## Task 18: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

The README must include all required sections from the spec. Use this template:

```markdown
# FirmaCheck

Webová aplikace pro rychlé ověření základních údajů o české firmě podle IČO přes veřejný rejstřík [ARES](https://ares.gov.cz).

**[→ Živé demo](https://firmacheck.vercel.app)**

---

## Funkce

- Ověření firmy podle IČO přes ARES API
- Zobrazení sídla firmy na mapě
- SQLite cache v prohlížeči (sql.js + IndexedDB)
- Uložené firmy s perzistencí
- Export do CSV a JSON

## Spuštění lokálně

\`\`\`bash
git clone https://github.com/kubik/firmacheck.git
cd firmacheck
npm install        # automaticky zkopíruje sql-wasm.wasm do public/
npm run dev        # http://localhost:3000
\`\`\`

## Technologický stack

| Vrstva | Technologie |
|---|---|
| Framework | Next.js 15 App Router |
| Styling | Tailwind CSS + shadcn/ui |
| Mapa | Leaflet.js + OpenStreetMap |
| Geocoding | Nominatim API |
| SQLite | sql.js (WASM) + idb (IndexedDB) |
| Testy | Vitest |
| Deployment | Vercel |

## API služby

- **ARES** (`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/`): veřejný rejstřík českých firem, bez API klíče
- **Nominatim** (OpenStreetMap): bezplatný geocoding, bez registrace

**Proč Nominatim místo Mapy.cz?** Nominatim nevyžaduje registraci ani API klíč, funguje hned po spuštění. Pro demo aplikaci tohoto rozsahu je přesnost i limit dostačující. Mapy.cz by byl vhodný pro produkční řešení s vyšším provozem nebo potřebou české lokalizace.

## SQLite cache

Aplikace používá **sql.js** — SQLite zkompilované do WebAssembly, které běží přímo v prohlížeči. Stav databáze se po každé změně serializuje a ukládá do **IndexedDB**, takže cache přetrvá i po obnovení stránky.

Cache je per-user (každý uživatel má vlastní DB v prohlížeči). Pro demo use case je to v pořádku — aplikace reaguje okamžitě na opakované dotazy.

Pro produkční server-side cache by bylo vhodné **Turso** (cloud SQLite kompatibilní s Vercel serverless).

## Ukládání firem

Uložené firmy jsou součástí stejné SQLite DB (tabulka `saved_companies`). Ukládají se s časovým razítkem a zdrojem dat. Data přetrvávají v IndexedDB.

## Export

- **CSV**: všechna pole dle specifikace, korektní escapování, UTF-8
- **JSON**: strukturovaný výstup, možnost kopírování do schránky

## AI nástroje

- **Claude Code** — celý vývoj (generování kódu, refactoring, testování, debugging)
- **Claude Code** — generování SVG hero ilustrace

## Ukázky promptů

**Prompt 1 — IČO validace:**
> "Implement Czech IČO checksum validation. The algorithm uses weights [8,7,6,5,4,3,2] on the first 7 digits, computes sum mod 11, and derives the expected 8th digit: if remainder=0 → 1, if remainder=1 → 0, else 11-remainder."

**Prompt 2 — sql.js v Next.js:**
> "Set up sql.js (WASM SQLite) in a Next.js 15 App Router client component with IndexedDB persistence via the idb library. The DB should initialize from IndexedDB if a saved snapshot exists, otherwise create fresh, and persist after every write."

**Prompt 3 — SVG hero ilustrace:**
> "Generate an SVG illustration (400x300) for a Czech company verification app. Show an abstract document with data lines, a verification seal with a checkmark, and an 'ARES ✓' badge. Use a minimal Linear-inspired style with indigo accent (#5B5BD6) and light gray tones. No text except the badge."

## Iterace

**Iterace 1 — volba SQLite řešení:**
Původní plán byl server-side SQLite (better-sqlite3). Po analýze Vercel serverless omezení (ephemeral filesystem) jsem přešel na browser-side sql.js + IndexedDB. Výhoda: nulová konfigurace backendu, funguje ihned na Vercel free tier.

**Iterace 2 — mapové API:**
Začínal jsem s Mapy.cz API, ale registrace a správa API klíče by zbytečně zdržela. Přepnul jsem na Nominatim (OpenStreetMap), který nevyžaduje žádný klíč a je pro tento rozsah plně dostačující.

## Co bych vylepšil s více času

- Server-side sdílená cache (Turso) pro sdílení výsledků mezi uživateli
- Vyhledávání podle názvu firmy (ARES full-text search)
- PWA / offline mód
- Tmavé téma (dark mode)
- Rate limiting na API routes
- E2E testy (Playwright)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add complete README with prompts, iterations, tech stack"
```

---

## Task 19: GitHub + Vercel Deploy

- [ ] **Step 1: Create GitHub repository**

```bash
gh repo create firmacheck --public --source=. --remote=origin --push
```

Or manually via GitHub web UI, then:
```bash
git remote add origin https://github.com/<username>/firmacheck.git
git push -u origin main
```

- [ ] **Step 2: Deploy to Vercel**

```bash
npx vercel --yes
```

Follow prompts, accept defaults for Next.js detection.

- [ ] **Step 3: Update README with live demo URL**

Replace `https://firmacheck.vercel.app` with the actual URL from the deploy output.

```bash
git add README.md
git commit -m "docs: add live demo URL"
git push
```

- [ ] **Step 4: Verify live demo**

Open the Vercel URL. Test:
- [ ] Search for IČO `02823519` → company details load
- [ ] Map renders
- [ ] Save company → persists on reload
- [ ] CSV export downloads

---

## Self-Review Checklist

- [x] **IČO validation** — Task 3 ✓
- [x] **ARES API** — Task 7 ✓
- [x] **Geocoding** — Task 8 ✓
- [x] **Status display (API vs cache)** — Task 11 (SourceBadge) ✓
- [x] **Name match** — Task 4 + Task 11 (NameMatchBadge) ✓
- [x] **Map with marker + coords + link** — Task 14 ✓
- [x] **SQLite cache (ARES + geocode)** — Task 9 ✓
- [x] **Saved companies with persistence** — Task 15 ✓
- [x] **CSV export** — Task 6 ✓
- [x] **JSON export + copy** — Task 6 + Task 15 ✓
- [x] **AI visual element** — Task 10 ✓
- [x] **Responsive layout** — Tailwind responsive classes in all components ✓
- [x] **README** — Task 18 ✓
- [x] **GitHub + Vercel** — Task 19 ✓
- [x] **No runtime LLM API** — no AI service calls in app code ✓
