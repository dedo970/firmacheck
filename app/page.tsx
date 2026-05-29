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

function SearchSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] p-6 flex flex-col gap-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="h-5 w-48 bg-[var(--surface)] rounded" />
          <div className="h-3.5 w-28 bg-[var(--surface)] rounded" />
        </div>
        <div className="h-5 w-16 bg-[var(--surface)] rounded-full" />
      </div>
      <div className="h-10 bg-[var(--surface)] rounded-md" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-3 w-20 bg-[var(--surface)] rounded" />
            <div className="h-4 w-32 bg-[var(--surface)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FirmaCheckApp() {
  const sqlite = useSQLite();
  const [result, setResult] = useState<CompanyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [currentIco, setCurrentIco] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [savedVersion, setSavedVersion] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (sqlite.ready) {
      setSavedCount(sqlite.getSavedCompanies().length);
    }
  }, [savedVersion, sqlite.ready]);

  async function handleSearch(ico: string, name: string, forceRefresh = false) {
    setLoading(true);
    setError('');
    setResult(null);
    setNameQuery(name);
    setCurrentIco(ico);

    try {
      let company = (sqlite.ready && !forceRefresh) ? sqlite.getAresCache(ico) : null;
      let aresSource: 'api' | 'cache' = 'cache';

      if (!company) {
        const res = await fetch(`/api/ares?ico=${ico}`);
        if (res.status === 404) {
          setError('Firma s tímto IČO nebyla nalezena.');
          return;
        }
        if (!res.ok) {
          setError('Nepodařilo se načíst data z ARES. Zkuste to znovu.');
          return;
        }
        const raw = await res.json();
        company = parseAresResponse(raw);
        sqlite.setAresCache(ico, company);
        aresSource = 'api';
      }

      let geo = (sqlite.ready && !forceRefresh) ? sqlite.getGeocodeCache(company.adresa) : null;
      let geoSource: 'api' | 'cache' | undefined;

      if (geo) {
        geoSource = 'cache';
      } else if (company.adresa) {
        const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(company.adresa)}`);
        if (geoRes.ok) {
          geo = await geoRes.json();
          if (sqlite.ready) sqlite.setGeocodeCache(company.adresa, geo!);
          geoSource = 'api';
        }
      }

      setResult({ company, aresSource, geo: geo ?? undefined, geoSource });

      // Update lastVerifiedAt if this company is already saved
      if (sqlite.ready && sqlite.isCompanySaved(company.ico)) {
        sqlite.updateSavedCompany(company.ico, company, geo ?? undefined, aresSource);
        setSavedVersion((v) => v + 1);
      }
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

  function handleRefresh() {
    if (currentIco) handleSearch(currentIco, nameQuery, true);
  }

  function handleSelectSaved(ico: string) {
    setShowSaved(false);
    handleSearch(ico, '');
  }

  const isSaved = result ? sqlite.isCompanySaved(result.company.ico) : false;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="border-b border-[var(--border)] sticky top-0 z-50 bg-[var(--background)]/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-[var(--accent)] flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">FirmaCheck</span>
          </div>
          <button
            onClick={() => setShowSaved((s) => !s)}
            className="cursor-pointer text-xs font-medium text-[var(--muted)] border border-[var(--border)] rounded-full px-3 py-1 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {showSaved ? '← Zpět' : savedCount > 0 ? `Uložené (${savedCount})` : 'Uložené'}
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">
        {!showSaved && (
          <>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Ověření firmy</h1>
              <p className="text-xs text-[var(--muted)] mt-0.5">Rejstřík ARES · lokální SQLite cache</p>
            </div>

            <SearchForm onSearch={handleSearch} loading={loading} />

            {error && (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
                {error}
              </div>
            )}

            {loading && <SearchSkeleton />}
            {!result && !loading && !error && <HeroIllustration />}

            {result && (
              <div key={result.company.ico} className="flex flex-col gap-6 animate-fade-in-up">
                <CompanyDetail
                  result={result}
                  nameQuery={nameQuery}
                  onSave={handleSave}
                  isSaved={isSaved}
                  onRefresh={handleRefresh}
                />
                {result.geo && (
                  <CompanyMap geo={result.geo} companyName={result.company.obchodniJmeno} />
                )}
              </div>
            )}
          </>
        )}

        {showSaved && (
          <div className="flex flex-col gap-6 animate-fade-in-up">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Uložené firmy</h2>
              <p className="text-sm text-[var(--muted)] mt-1">Firmy uložené do vaší lokální SQLite databáze.</p>
            </div>
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
