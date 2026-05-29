# FirmaCheck

Webová aplikácia na rýchle overenie základných údajov o českej firme podľa IČO cez verejný register [ARES](https://ares.gov.cz). Vznikla ako praktická úloha k prihláške na pozíciu AI Product Builder.

**[→ Živé demo](https://firmacheck-flax.vercel.app)**

---

## Čo aplikácia vie

- Vyhľadanie firmy podľa IČO (8 číslic) s validáciou kontrolného súčtu pred odoslaním do API
- Porovnanie zadaného názvu firmy s názvom z ARES — výsledok: zhoda / čiastočná zhoda / nezhoda
- Zobrazenie sídla firmy na interaktívnej mape (Leaflet + OpenStreetMap tiles)
- SQLite cache v prehliadači — opakovaný dotaz na rovnaké IČO alebo adresu sa načíta z cache, nie z API
- Viditeľný indikátor zdroja dát pre každý dotaz: `ARES dáta: API` alebo `ARES dáta: cache`
- Sekcia **Uložené firmy** — pretrváva po obnovení stránky, kliknutím znovu zobrazí detail
- Export do CSV a JSON, kopírovanie JSON do schránky

---

## Spustenie lokálne

```bash
git clone https://github.com/dedo970/firmacheck.git
cd firmacheck
npm install        # postinstall automaticky skopíruje sql-wasm.wasm do public/
npm run dev        # http://localhost:3000
```

Aplikácia nevyžaduje žiadne API kľúče ani environment variables.

---

## Technologický stack

| Vrstva     | Technológia                | Verzia      |
| ---------- | -------------------------- | ----------- |
| Framework  | Next.js App Router         | 16          |
| Styling    | Tailwind CSS + shadcn/ui   | —           |
| Mapa       | Leaflet.js + react-leaflet | —           |
| Geocoding  | Nominatim (OpenStreetMap)  | verejné API |
| SQLite     | sql.js (WASM) + idb        | —           |
| Testy      | Vitest + jsdom             | —           |
| Deployment | Vercel                     | free tier   |

---

## Architektonické rozhodnutia

### 1. SQLite v prehliadači (sql.js + IndexedDB)

**Problém:** Vercel a Netlify Functions bežia v serverless prostredí s _ephemeral filesystemom_ — klasická server-side SQLite (better-sqlite3, sqlite3) nemôže medzi requestmi ukladať dáta na disk, pretože každý lambda container je izolovaný a dočasný.

**Alternatívy, ktoré som zvažoval:**

| Riešenie                  | Verdikt | Dôvod                                                              |
| ------------------------- | ------- | ------------------------------------------------------------------ |
| better-sqlite3 / sqlite3  | ❌      | Ephemeral filesystem na Verceli                                    |
| Turso (cloud SQLite)      | ❌      | Vyžaduje registráciu, konfiguráciu, env variables                  |
| Vlastný backend (Railway) | ❌      | Zbytočná komplexita pre demo                                       |
| sql.js (WASM) + IndexedDB | ✅      | Funguje bez akejkoľvek konfigurácie, nasadí sa na Vercel free tier |

**Ako to funguje:** sql.js je SQLite skompilovaný do WebAssembly — celý databázový engine beží priamo v prehliadači. Po každej write operácii sa stav DB serializuje (`.export()`) a uloží do IndexedDB cez knižnicu `idb`. Pri načítaní stránky sa DB obnoví z IndexedDB, takže cache aj uložené firmy pretrvajú aj po zatvorení prehliadača.

**Tradeoff:** Cache je _per-user_ — každý používateľ má vlastnú databázu v prehliadači. Pre tento use case (verifikačný nástroj pre jedného používateľa) je to v poriadku a bolo to aj explicitne uvedené v zadaní ako prijateľné riešenie.

---

### 2. Geocoding: Nominatim namiesto Mapy.cz

**Prečo nie Mapy.cz:** Mapy.cz API (preferované v zadaní) vyžaduje registráciu a správu API kľúča. To by pridalo závislosť a nutnosť konfigurovať secrets vo Verceli — zbytočná bariéra pre demo aplikáciu.

**Prečo Nominatim:** Verejné API postavené na dátach OpenStreetMap. Bez registrácie, bez API kľúča. Pre pokrytie Českej republiky je presnosť plne postačujúca.

**Implementačný detail:** Nominatim vyžaduje prítomnosť `User-Agent` headera — prehliadač ho z bezpečnostných dôvodov nemôže nastaviť pri priamom fetch requeste. Preto geocoding volám cez Next.js API route (`/api/geocode`), ktorá header pridá na serveri. Tým vyriešim zároveň aj CORS obmedzenia.

---

### 3. Next.js API routes ako proxy

Oba externé API (ARES aj Nominatim) som obalil do Next.js API routes (`/api/ares`, `/api/geocode`). Dôvody:

- **CORS:** ARES API má obmedzujúce CORS hlavičky, priamy fetch z prehliadača by zlyhal
- **User-Agent:** Nominatim vyžaduje identifikáciu v headeri
- **Error handling:** Centralizované mapovanie HTTP chýb (404 → "firma nenájdená", 5xx → zrozumiteľná hláška)
- **IČO normalizácia:** Route doplní IČO na 8 číslic (padding nulami) pred odoslaním do ARES

---

### 4. Leaflet s dynamickým importom (ssr: false)

Leaflet.js používa `window` a `document` pri inicializácii, čo zlyhá pri server-side renderingu v Next.js. Riešenie: `dynamic(() => import('./company-map-inner'), { ssr: false })`. Mapa sa renderuje výhradne na klientovi, server odosiela prázdny placeholder.

---

### 5. IČO validácia s kontrolným súčtom

Pred každým API volaním validujem IČO algoritmom kontrolného súčtu (váhy `[8,7,6,5,4,3,2]`, mod 11). Tým odfiltruje zjavne neplatné IČO ešte v prehliadači, bez zbytočného API requestu. Algoritmus je implementovaný ako čistá funkcia s plným pokrytím Vitest testmi.

---

### 6. Cache TTL 7 dní

Dáta o firmách sa nemenia každý deň. TTL 7 dní je kompromis medzi aktuálnosťou dát a počtom API requestov. Implementácia: každý cache záznam obsahuje `created_at` timestamp; pri čítaní porovnám s `Date.now()` a pri prekročení TTL cache ignorujem a načítam čerstvé dáta z API. Tlačidlo **↻ Obnoviť z API** umožní manuálny bypass cache kedykoľvek.

---

## API služby

### ARES (Administratívny register ekonomických subjektov)

- **Endpoint:** `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}`
- **Prevádzkovateľ:** Ministerstvo financií ČR
- **Autentizácia:** Žiadna — verejné API bez registrácie
- **Proxy:** `/api/ares?ico=XXXXXXXX`
- **Načítávané dáta:** IČO, obchodný názov, právna forma, dátum vzniku, stav subjektu, adresa sídla, DIČ

### Nominatim (OpenStreetMap)

- **Endpoint:** `https://nominatim.openstreetmap.org/search?q={adresa}&countrycodes=cz&format=json`
- **Prevádzkovateľ:** OpenStreetMap Foundation
- **Autentizácia:** Žiadna — vyžaduje iba `User-Agent` header
- **Proxy:** `/api/geocode?address=...`
- **Výstup:** GPS súradnice `{lat, lng}`

---

## SQLite cache

```
Prehliadač → sql.js SQLite (WASM)
              ├── ares_cache       (ico → data JSON, source, created_at)
              ├── geocode_cache    (address → lat, lng, created_at)
              └── saved_companies  (ico → data JSON, saved_at, last_verified_at, source)
                          ↓ po každom zápise
                IndexedDB (firmacheck-v1 / key: "main")
```

Pri opakovanom vyhľadávaní toho istého IČO sa najprv skontroluje `ares_cache`. Ak záznam existuje a nie je starší ako 7 dní, vráti sa z cache. Geocoding funguje rovnako. Uložené firmy sú v tej istej DB — pri znovu-overení uloženej firmy sa aktualizuje `last_verified_at`.

---

## Ukladanie firiem

Uložené firmy sú uložené v tabuľke `saved_companies` v tej istej SQLite databáze. Každý záznam obsahuje:

- `ico` — primárny kľúč
- `data` — JSON s kompletními údajmi z ARES + GPS súradnicami
- `saved_at` — čas prvého uloženia (nemení sa pri aktualizácii)
- `last_verified_at` — čas posledného overenia (aktualizuje sa pri každom vyhľadávaní firmy, ktorá je uložená)
- `source` — zdroj posledného načítania dát (`api` / `cache`)

Dáta pretrvávajú v IndexedDB nezávisle od session, zatvorenia záložky ani reštartu prehliadača.

---

## Export dát

| Formát | Obsah                                                                                         | Spôsob                |
| ------ | --------------------------------------------------------------------------------------------- | --------------------- |
| CSV    | IČO, názov, právna forma, stav, adresa, dátum vzniku, dátum overenia, zdroj, GPS lat, GPS lng | Stiahnuť súbor        |
| JSON   | Kompletný objekt so všetkými uloženými poľami                                                 | Stiahnuť súbor        |
| JSON   | Rovnaký obsah                                                                                 | Kopírovať do schránky |

CSV je správne escapované (polia s čiarkami sú uzavreté do úvodzoviek), kódované UTF-8 s BOM pre správne zobrazenie v Exceli.

---

## AI vizuálny prvok

### Nástroj

**Claude Code** — generovanie SVG kódu z textového promptu.

### Prompt

> _"Generate an SVG illustration (400×300) for a Czech company verification app. Show an abstract document with placeholder data lines, a verification seal with a checkmark, and an 'ARES ✓' badge. Use a minimal Linear-inspired style with indigo accent (#5B5BD6), light gray tones, subtle grid background. No decorative text except the badge."_

### Prečo je v aplikácii?

Hero ilustrácia (`public/hero.svg`) sa zobrazuje v **prázdnom stave** aplikácie — teda v momente, keď používateľ ešte nezadal žiadne IČO a formulár čaká na vstup. Bez vizuálneho prvku by táto plocha pôsobila prázdne a nedokončene.

Ilustrácia plní dve funkcie: vizuálne komunikuje účel aplikácie (overovanie firemných dokumentov cez register) a dáva rozhraniu charakter ešte predtým, ako používateľ začne pracovať. Zámerné som zvolil minimalistický štýl zladený s celkovým dizajnom aplikácie.

---

## AI nástroje použité pri vývoji

| Nástroj         | Spôsob použitia                                                                       |
| --------------- | ------------------------------------------------------------------------------------- |
| **Claude Code** | Celý vývoj — architektúra, implementácia všetkých komponentov, debugging, refactoring |
| **Claude Code** | Generovanie SVG hero ilustrácie                                                       |
| **Claude Code** | Návrh UX/UI (Linear-inspired design system, responzívny layout)                       |
| **Claude Code** | Generovanie Vitest testov pre pure functions                                          |
| **Claude Code** | Príprava dokumentácie (README)                                                        |

Aplikáciu som vyvíjal metódou iteratívneho promptovania: špecifikoval som cieľ, skontroloval výstup, identifikoval problémy a zadal opravný prompt. AI generovalo kód, ja som reviewoval správnosť, funkčnosť a súlad so zadaním.

---

## Ukážky promptov

**Prompt 1 — IČO validácia s testami:**

> _"Implement Czech IČO checksum validation. The algorithm uses weights [8,7,6,5,4,3,2] on the first 7 digits, computes the sum, takes mod 11, and derives the expected 8th digit: if remainder=0 → 1, if remainder=1 → 0, else 11-remainder. Write it as a pure TypeScript function with full Vitest test coverage including edge cases."_

**Prompt 2 — sql.js v Next.js App Router:**

> _"Set up sql.js (WASM SQLite) in a Next.js 16 App Router client component with IndexedDB persistence via the idb library. The DB should initialize from IndexedDB if a saved snapshot exists, otherwise create fresh tables. Persist to IndexedDB after every write. Expose cache and saved-companies operations via React context. Handle the SQLite WASM file via postinstall script that copies it to /public."_

**Prompt 3 — SVG hero ilustrácia:**

> _"Generate an SVG illustration (400×300) for a Czech company verification app. Show an abstract document with placeholder data lines, a verification seal with a checkmark, and an 'ARES ✓' badge. Use a minimal Linear-inspired style with indigo accent (#5B5BD6), light gray tones, subtle grid background. No decorative text except the badge."_

---

## Iterácie

**Iterácia 1 — SQLite: server-side → prehliadač**

Pôvodný zámer bol server-side SQLite (better-sqlite3) — prirodzená voľba pre Next.js. Pri príprave deploymentu som zistil, že Vercel serverless funkcie majú ephemeral filesystem: každý request môže dostať nový container bez prístupu k dátam predchádzajúcich requestov. Databázový súbor by sa medzi requestmi stratil.

Prešiel som na **sql.js + IndexedDB** — SQLite celý beží v prehliadači ako WASM modul. Výhoda: nulová konfigurácia backendu, funguje na Vercel free tier bez ďalších služieb. Nevýhoda: cache je per-user (každý používateľ má vlastnú DB), ale pre verifikačný nástroj tohto rozsahu je to akceptovateľné riešenie.

**Iterácia 2 — Geocoding: Mapy.cz → Nominatim**

Začínal som s Mapy.cz API (odporúčaná voľba v zadaní). Narazil som na to, že vytvorenie vývojárskeho účtu na Mapy.cz a správa API kľúča by pridali zbytočnú konfiguračnú bariéru — secrets v Vercel env variables, nutnosť API kľúč rotovať atď.

Prešiel som na **Nominatim (OpenStreetMap)**: verejné API bez registrácie, funguje ihneď bez akejkoľvek konfigurácie. Presnosť pre české PSČ a adresy je plne postačujúca. Nominatim vyžaduje iba `User-Agent` header, ktorý pridávam v server-side API route — CORS a bezpečnostné obmedzenia prehliadača tým obídem elegantne.

**Iterácia 3 — Oprava isCompanySaved (bug)**

Po prvom testovaní som zistil, že tlačidlo "Uložiť firmu" okamžite zobrazuje "✓ Uložené" aj pri neuložených firmách. Príčina: funkcia `isCompanySaved` používala `stmt.getAsObject()` z sql.js — pri žiadnom výsledku táto metóda vrátila `{'1': undefined}` (kľúč existuje, hodnota je undefined). `Object.keys().length` bolo vždy 1, teda funkcia vracala `true` vždy.

Oprava: nahradil som `getAsObject()` priamym volaním `stmt.bind() + stmt.step()`, ktoré správne vráti `false` pri žiadnom výsledku.

---

## Čo by som vylepšil s viac času

- **Turso (cloud SQLite)** — server-side zdieľaná cache pre zdieľanie výsledkov medzi používateľmi
- **ARES full-text search** — vyhľadávanie podľa časti názvu firmy, nielen presného IČO
- **PWA / Service Worker** — offline prístup k skôr načítaným firmám bez pripojenia k internetu
- **Rate limiting cez Redis** — perzistentný limit naprieč Vercel instances (aktuálne in-memory)
- **E2E testy (Playwright)** — automatizované testovanie celého používateľského flow
- **Export vybranej firmy** — možnosť exportovať detail len jednej konkrétnej firmy zo zoznamu
- **Batch overenie** — načítanie viacerých IČO naraz zo súboru (CSV import)

---

## Kvalita kódu a CI

Repozitár má nastavené:

- **Prettier** — jednotné formátovanie (`npm run format:check` v CI)
- **ESLint** — Next.js + TypeScript pravidlá + `no-console`, `no-explicit-any`, `prefer-const`
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — na každý push/PR beží: format check → lint → typecheck → testy → build → `npm audit --audit-level=high`
- **Dependabot** — týždenné kontroly npm závislostí

### npm audit

`npm audit` hlási 2 moderate zraniteľnosti v `postcss` — ide o verziu bundlovanú **vnútri `next@16.2.6`**, nie o priamu závislosť projektu. Oprava cez `npm audit fix --force` by downgrade-ovala Next.js na verziu 9.3.3 (breaking change). CI preto kontroluje iba `--audit-level=high`, kým Next.js nevydá patch.

### Git história

Commity sú squashnuté do 5 logických celkov namiesto granulárnej vývojovej histórie. Dôvod: pri iteratívnom vývoji s AI asistenciou vznikajú desiatky malých opravných commitov ("fix: cursor-pointer", "fix: hydration mismatch"), ktoré by zahlcovali `git log` bez pridanej hodnoty pre code review. Výsledná história ukazuje architektúru projektu, nie priebeh relácie.

---

## Čas strávený na úlohe

S AI asistenciou (Claude Code) približne **3–4 hodiny** reálneho času. Funkčný základ — ARES integrácia, SQLite cache, mapa, export — vznikol za zhruba 1,5 hodiny. Zostávajúci čas išiel na UI polish (Linear-inspired design system), bezpečnostné vylepšenia nad rámec zadania (rate limiting, CSP, HSTS, CSV formula injection) a dokumentáciu.
