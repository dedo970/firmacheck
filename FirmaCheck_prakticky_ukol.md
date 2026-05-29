# Praktický úkol k přihlášce

## FirmaCheck – ověření firmy podle IČO

Společně s CV nám pošlete krátký praktický úkol. Cílem je ověřit, že umíte pomocí AI nástrojů vytvořit malou funkční webovou aplikaci, pracovat s GitHubem, napojit veřejné API, použít jednoduchou cache, nasadit výsledek online a stručně zdokumentovat postup.

Nejde o akademický test programování. Chceme vidět, jak přemýšlíte, jak používáte AI nástroje, jak iterujete, jak testujete a jestli dokážete dodat funkční výsledek.

**Časová dotace:** cca **2–4 hodiny**

V odevzdání nám napiš, kolik času ti to reálně zabralo. Není v tom žádný háček — odhad vlastního času je sám o sobě užitečná informace.

---

# Zadání

Vytvořte webovou aplikaci **FirmaCheck**.

Aplikace slouží k rychlému ověření základních údajů o české firmě. Uživatel zadá IČO, případně i název firmy, klikne na tlačítko a aplikace ověří firmu přes ARES, zobrazí základní údaje, ukáže sídlo firmy na mapě, umožní firmu uložit do seznamu a uložené firmy exportovat.

---

# Vstup aplikace

Aplikace bude mít maximálně dvě vstupní pole:

## 1. IČO firmy

Povinné pole.

Příklad:

```text
02823519
```

## 2. Název firmy

Volitelné pole pro kontrolu shody s údaji z ARESu.

Příklad:

```text
ideabox
```

Hlavní tlačítko:

```text
Ověřit firmu
```

---

# Povinný výstup aplikace

Po kliknutí na tlačítko **Ověřit firmu** aplikace zobrazí přehledný detail firmy.

## 1. Stav ověření

Aplikace musí zobrazit, v jakém stavu ověření je.

Například:

- firma nalezena,
- firma nenalezena,
- chyba při načítání dat,
- data načtena z ARES API,
- data načtena ze SQLite cache.

---

## 2. Údaje z ARES

Aplikace musí načíst údaje z **ARES API** a zobrazit minimálně:

- IČO,
- obchodní název,
- právní formu,
- datum vzniku,
- stav subjektu,
- adresu sídla,
- DIČ, pokud je dostupné.

---

## 3. Kontrola názvu firmy

Pokud uživatel zadá také název firmy, aplikace porovná zadaný název s názvem z ARESu.

Stačí jednoduché porovnání:

- shoda,
- částečná shoda,
- neshoda.

Porovnání může ignorovat:

- velikost písmen,
- mezery,
- základní interpunkci.

Příklad výstupu:

```text
Zadaný název „ideabox“ odpovídá firmě „ideabox s.r.o.“
```

nebo:

```text
Zadaný název se liší od názvu uvedeného v ARES.
```

---

## 4. Mapa sídla firmy

Aplikace musí zobrazit sídlo firmy na mapě.

Postup:

1. vezme adresu sídla z ARESu,
2. převede adresu na souřadnice pomocí mapového/geocoding API,
3. zobrazí sídlo firmy na mapě.

Preferované řešení:

- Mapy.cz / Mapy.com API.

Přípustná alternativa:

- jiné vhodné bezplatné mapové nebo geocoding API, pokud v dokumentaci vysvětlíte, proč jste ho použili.

Výstup má obsahovat:

- mapu s markerem sídla,
- souřadnice,
- odkaz na otevření adresy v mapě.

---

## 5. SQLite cache

Aplikace musí obsahovat jednoduchou **SQLite cache** pro odpovědi z API.

Minimální očekávání:

- při prvním dotazu se data načtou z ARES API,
- odpověď se uloží do SQLite cache,
- při opakovaném dotazu na stejné IČO se použije cache,
- geocoding výsledek se také uloží do cache,
- při opakovaném dotazu na stejnou adresu se použije cache,
- aplikace viditelně zobrazí, zda data pochází z API nebo z cache.

Příklad zobrazení:

```text
ARES data: API
Geocoding: SQLite cache
```

Nejde o produkční databázové řešení. Stačí jednoduchý princip a jasné vysvětlení v dokumentaci.

### Pozor na deployment platformy

Některé hostingové platformy (např. Vercel, Netlify Functions) běží **serverless** a nemají perzistentní filesystem — klasická server-side SQLite (better-sqlite3, sqlite3 a podobné) tam mezi requesty neudrží data.

Vyřešit to můžeš několika způsoby, vyber si jeden a v dokumentaci popiš proč:

- **SQLite v prohlížeči** přes WASM (sql.js, wa-sqlite) s perzistencí v IndexedDB nebo OPFS — cache i uložené firmy mohou žít v jedné DB na klientovi,
- **cloud SQLite** (Turso / libSQL) — server-side, ale s perzistencí mimo ephemeral filesystem,
- **vlastní backend** mimo serverless platformu (Railway, Render, vlastní server),
- **jiné řešení**, pokud ho dokážeš obhájit v dokumentaci.

Pokud zvolíš browser-side SQLite, ber v úvahu, že cache je per-user (každý uživatel má vlastní). Pro tenhle use case to je v pořádku, ale popiš to v dokumentaci.

---

## 6. Uložené firmy

Aplikace musí umožnit uložit ověřenou firmu do seznamu **Uložené firmy**.

Minimální požadavky:

- po ověření firmy lze kliknout na tlačítko **Uložit firmu**,
- uložené firmy se zobrazují v samostatné sekci,
- u každé uložené firmy je vidět alespoň:
  - název firmy,
  - IČO,
  - adresa sídla,
  - datum posledního ověření,
- kliknutím na uloženou firmu se znovu zobrazí její detail,
- uloženou firmu lze ze seznamu odebrat,
- uložené firmy zůstanou dostupné i po obnovení stránky.

Způsob uložení je na vás. Ideálně využijte stejný storage mechanismus jako pro SQLite cache (viz výše) — udržíte tím jednotnou architekturu. V dokumentaci vysvětlete, proč jste zvolili dané řešení.

---

## 7. Export uložených firem

Aplikace musí umožnit exportovat seznam uložených firem.

Minimální požadavek:

- export uložených firem do **CSV**.

CSV export musí obsahovat minimálně:

- IČO,
- obchodní název,
- právní formu,
- stav subjektu,
- adresu sídla,
- datum vzniku,
- datum posledního ověření,
- zdroj posledního načtení dat: API/cache,
- souřadnice sídla, pokud jsou dostupné.

CSV musí:

- jít stáhnout jako soubor,
- obsahovat hlavičku sloupců,
- exportovat skutečně uložené firmy, ne ukázková/fake data.

Bonus:

- export do JSON,
- tlačítko **Kopírovat JSON do schránky**,
- možnost exportovat jen vybranou firmu,
- ošetření prázdného seznamu uložených firem.

---

# Povinné technické požadavky

Aplikace musí obsahovat:

- veřejný GitHub repozitář,
- nasazené demo na **Vercel** nebo **Netlify**,
- napojení na **ARES API**,
- napojení na **Mapy.cz / Mapy.com API** nebo jiné vhodné mapové/geocoding API,
- jednoduchou **SQLite cache** pro odpovědi z API,
- sekci **Uložené firmy**,
- export uložených firem do **CSV**,
- responzivní UX/UI,
- základní validaci IČO,
- chybový stav pro neexistující IČO nebo selhání API,
- alespoň jeden vizuální prvek vygenerovaný pomocí AI,
- dokumentaci v `README.md`.

---

# Omezení

Nepoužívejte runtime LLM API typu OpenAI, Anthropic, Gemini apod.

AI nástroje použijte při:

- vývoji aplikace,
- návrhu UX/UI,
- generování vizuálních prvků,
- testování,
- přípravě dokumentace.

Samotná aplikace má fungovat pomocí běžné aplikační logiky, ARES API, mapového/geocoding API a SQLite cache.

---

# AI vizuální prvek

Do aplikace přidejte alespoň **jeden vizuální prvek vygenerovaný pomocí AI**.

Může to být například:

- hero ilustrace,
- prázdný stav aplikace,
- ilustrační grafika ověřování firmy,
- mapa/office/business ilustrace,
- ikona nebo vizuální doplněk.

V dokumentaci uveďte:

- jakým nástrojem byl vizuál vytvořen,
- jaký prompt jste použili,
- proč jste ho do aplikace umístili.

---

# README dokumentace

Repozitář musí obsahovat soubor `README.md`, kde bude:

- stručný popis aplikace,
- odkaz na živé demo,
- návod ke spuštění lokálně,
- použitý technologický stack,
- použité API služby,
- vysvětlení SQLite cache,
- vysvětlení ukládání firem,
- vysvětlení CSV/JSON exportu,
- použité AI nástroje,
- alespoň **3 ukázky promptů**,
- popis minimálně **2 iterací** během práce,
- co byste vylepšili, kdybyste měli více času.

---

# Doporučený technologický stack

Můžete použít vlastní řešení, pokud splní zadání.

Doporučené varianty:

## Varianta A

- Next.js,
- SQLite,
- API routes,
- Vercel.

## Varianta B

- Node.js / Express,
- SQLite,
- jednoduchý frontend,
- Netlify/Vercel pro frontend,
- vhodná platforma pro backend.

## Varianta C

- jiný stack dle vlastního výběru,
- nutné dobře popsat v dokumentaci.

---

# Co odevzdat

Pošlete nám:

1. odkaz na veřejný GitHub repozitář,
2. odkaz na živé demo,
3. stručné CV nebo profesní profil,
4. informaci, kolik času jste na úkolu přibližně strávili,
5. případně poznámku, co se nepodařilo dokončit a proč.
