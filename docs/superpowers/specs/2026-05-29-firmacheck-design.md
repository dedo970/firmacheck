# FirmaCheck — Design Spec

**Date:** 2026-05-29  
**Status:** Approved

---

## Overview

FirmaCheck is a Czech company verification web app. Users enter an IČO (and optionally a company name), the app fetches data from the ARES public registry, shows company details + HQ location on a map, caches results in SQLite, and lets users save/export companies.

---

## Architecture

### Stack

| Layer      | Technology                         | Reason                                                                            |
| ---------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| Framework  | Next.js 15 App Router              | Vercel-native, API routes avoid CORS                                              |
| Styling    | Tailwind CSS + shadcn/ui           | Linear-style minimal UI; well-maintained component primitives                     |
| Map        | Leaflet.js + OpenStreetMap tiles   | No API key, no rate limits for this scale                                         |
| Geocoding  | Nominatim (OSM) via `/api/geocode` | Free, no key, sufficient accuracy for CZ addresses                                |
| SQLite     | sql.js (WASM) + idb (IndexedDB)    | Per-user persistence in-browser; no backend DB needed; works on Vercel serverless |
| Deployment | Vercel                             | Per task requirements                                                             |

### Why browser-side SQLite (not Turso)?

sql.js runs SQLite compiled to WASM in the browser. State is persisted to IndexedDB after every mutation. This means zero additional services, zero API keys, instant cold start, and the entire app deploys as a pure Next.js project. Trade-off: cache is per-user (each user has their own DB). The spec explicitly accepts this.

### Why Nominatim instead of Mapy.cz?

Nominatim is fully free with no API key registration. Mapy.cz requires account + API key. For a demo/portfolio app, removing friction is the right call. Documented in README.

---

## Data Layer

### SQLite Schema (browser-side, sql.js)

```sql
CREATE TABLE IF NOT EXISTS ares_cache (
  ico TEXT PRIMARY KEY,
  data TEXT NOT NULL,       -- JSON blob from ARES
  source TEXT NOT NULL,     -- 'api' | 'cache'
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
  data TEXT NOT NULL,       -- JSON blob (ARES + geocode merged)
  saved_at INTEGER NOT NULL,
  last_verified_at INTEGER NOT NULL,
  source TEXT NOT NULL      -- source of last verification
);
```

### API Routes (server-side, avoids CORS)

- `GET /api/ares?ico={ico}` — proxies `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}`
- `GET /api/geocode?address={address}` — proxies `https://nominatim.openstreetmap.org/search`

Cache logic runs entirely client-side: check SQLite first, call API route on miss, write result to SQLite.

---

## UI Design

### Visual Style: Linear-inspired minimalism

- **Font:** Inter (system-ui fallback)
- **Colors:** Near-white background (`#FAFAFA`), near-black text (`#0F0F0F`), subtle grays for borders/muted text, single accent color (indigo `#5B5BD6`) for primary actions
- **Spacing:** Generous whitespace, 8px base grid
- **Components:** No heavy shadows; thin 1px borders; clean badges; monospace for IČO/IDs
- **Dark mode:** System-preference aware via Tailwind `dark:`

### Layout

```
┌─────────────────────────────────────────┐
│  FirmaCheck                    [Uložené] │  ← top nav, minimal
├─────────────────────────────────────────┤
│                                         │
│   [Hero illustration — AI generated]    │  ← only on empty state
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  IČO *          [Ověřit firmu]  │   │
│   │  Název firmy (volitelné)        │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌── Company Detail ───────────────┐   │
│   │  Ideabox s.r.o.    ● Aktivní    │   │
│   │  IČO: 02823519  DIČ: CZ...      │   │
│   │  Právní forma: s.r.o.           │   │
│   │  Vznik: 12. 3. 2014             │   │
│   │  Adresa: Náměstí ...            │   │
│   │                                 │   │
│   │  [API] Název: ✓ shoda           │   │
│   │                                 │   │
│   │  ┌─── Mapa ──────────────────┐  │   │
│   │  │   [Leaflet map + marker]   │  │   │
│   │  │   50.0875°N, 14.4213°E    │  │   │
│   │  │   Otevřít v mapách ↗      │  │   │
│   │  └───────────────────────────┘  │   │
│   │                                 │   │
│   │  [Uložit firmu]                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌── Uložené firmy ────────────────┐   │
│   │  Ideabox s.r.o.   02823519  … ✕ │   │
│   │  ...                             │   │
│   │  [Export CSV]  [Export JSON]     │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## Components

| Component          | Responsibility                                                     |
| ------------------ | ------------------------------------------------------------------ |
| `SearchForm`       | IČO input (validates 8 digits) + optional name input + submit      |
| `CompanyDetail`    | Renders ARES data, name-match badge, source badge (API/cache)      |
| `NameMatchBadge`   | Compares user input vs ARES name: exact / partial / no match       |
| `CompanyMap`       | Leaflet map, marker, coordinates display, OSM link                 |
| `SavedCompanies`   | List of saved companies, click-to-load, delete, CSV/JSON export    |
| `SQLiteProvider`   | React context; initialises sql.js, persists to IndexedDB on change |
| `SourceBadge`      | Small `API` or `SQLite cache` badge shown on detail card           |
| `HeroIllustration` | AI-generated SVG shown in empty state only                         |

---

## Data Flow

```
User submits IČO
  │
  ├─ SQLiteProvider: check ares_cache
  │     HIT  → return cached data, source='cache'
  │     MISS → fetch /api/ares → write to ares_cache, source='api'
  │
  ├─ Render CompanyDetail (with SourceBadge)
  │
  ├─ SQLiteProvider: check geocode_cache
  │     HIT  → return cached coords, source='cache'
  │     MISS → fetch /api/geocode → write to geocode_cache
  │
  ├─ Render CompanyMap
  │
  └─ "Uložit firmu" click → write to saved_companies
```

---

## IČO Validation

- Must be exactly 8 digits (left-pad with zeros if needed)
- Checksum validation via standard Czech IČO algorithm (weighted sum mod 11)
- Show inline error before API call

---

## Error States

| Situation                | UI                                                   |
| ------------------------ | ---------------------------------------------------- |
| IČO not found (ARES 404) | "Firma s tímto IČO nebyla nalezena."                 |
| ARES API error           | "Nepodařilo se načíst data z ARES. Zkuste to znovu." |
| Geocoding failed         | Map hidden, show address text only                   |
| Empty saved list         | Friendly empty state with illustration               |

---

## CSV Export Schema

```
ico,nazev,pravni_forma,stav,adresa,datum_vzniku,datum_overeni,zdroj,lat,lng
```

All columns always present; lat/lng empty string if geocoding failed.

---

## AI Visual Element

- **What:** SVG hero illustration — abstract document-verification / seal graphic with subtle Czech identity
- **Tool:** Claude Code (SVG generated via prompt)
- **Placement:** Empty state (before first search)
- **README prompt:** Documented in README with exact prompt text and iteration notes

---

## README Sections

1. App description + live demo link
2. Local setup (`npm install && npm run dev`)
3. Tech stack table
4. API services (ARES, Nominatim) + why Nominatim over Mapy.cz
5. SQLite cache explanation (browser WASM + IndexedDB)
6. Saved companies explanation
7. CSV/JSON export
8. AI tools used (Claude Code for development + SVG generation)
9. 3 prompt examples
10. 2 iteration descriptions
11. What I'd improve with more time

---

## Out of Scope

- Authentication / multi-user
- Server-side shared cache
- Batch IČO lookup
- ARES historical data
