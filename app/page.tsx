'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { SQLiteProvider, useSQLite } from '@/lib/sqlite-provider';
import { SearchForm } from '@/components/search-form';
import { CompanyDetail } from '@/components/company-detail';
import { CompanyMap } from '@/components/company-map';
import { SavedCompanies } from '@/components/saved-companies';
import { HeroIllustration } from '@/components/hero-illustration';
import type { AresCompany, CompanyResult, GeoPoint } from '@/types';

function SearchSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-xl border border-[var(--border)] p-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-5 w-48 rounded bg-[var(--surface)]" />
          <div className="h-3.5 w-28 rounded bg-[var(--surface)]" />
        </div>
        <div className="h-5 w-16 rounded-full bg-[var(--surface)]" />
      </div>
      <div className="h-10 rounded-md bg-[var(--surface)]" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-3 w-20 rounded bg-[var(--surface)]" />
            <div className="h-4 w-32 rounded bg-[var(--surface)]" />
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

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const savedCount = useMemo(
    () => (sqlite.ready ? sqlite.getSavedCompanies().length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sqlite.ready, savedVersion],
  );

  async function handleSearch(ico: string, name: string, forceRefresh = false) {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');
    setResult(null);
    setNameQuery(name);
    setCurrentIco(ico);

    try {
      let company = sqlite.ready && !forceRefresh ? sqlite.getAresCache(ico) : null;
      let aresSource: 'api' | 'cache' = 'cache';

      if (!company) {
        const res = await fetch(`/api/ares?ico=${ico}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (res.status === 404) {
          setError('Firma s tímto IČO nebyla nalezena.');
          return;
        }
        if (!res.ok) {
          setError('Nepodařilo se načíst data z ARES. Zkuste to znovu.');
          return;
        }
        company = (await res.json()) as AresCompany;
        sqlite.setAresCache(ico, company);
        aresSource = 'api';
      }

      let geo: GeoPoint | null =
        sqlite.ready && !forceRefresh ? sqlite.getGeocodeCache(company.adresa) : null;
      let geoSource: 'api' | 'cache' | undefined;

      if (geo) {
        geoSource = 'cache';
      } else if (company.adresa.trim()) {
        const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(company.adresa)}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (typeof geoData?.lat === 'number' && typeof geoData?.lng === 'number') {
            geo = geoData as GeoPoint;
            if (sqlite.ready) sqlite.setGeocodeCache(company.adresa, geo);
            geoSource = 'api';
          }
        }
      }

      if (controller.signal.aborted) return;
      setResult({ company, aresSource, geo: geo ?? undefined, geoSource });

      // Update lastVerifiedAt if this company is already saved
      if (sqlite.ready && sqlite.isCompanySaved(company.ico)) {
        sqlite.updateSavedCompany(company.ico, company, geo ?? undefined, aresSource);
        setSavedVersion((v) => v + 1);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Neočekávaná chyba. Zkuste to znovu.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
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

  const isSaved = useMemo(
    () => (result && sqlite.ready ? sqlite.isCompanySaved(result.company.ico) : false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result?.company.ico, savedVersion, sqlite.ready],
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--accent)]"
              aria-hidden="true"
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">FirmaCheck</span>
          </div>
          <button
            onClick={() => setShowSaved((s) => !s)}
            className="cursor-pointer rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none"
          >
            {showSaved ? '← Zpět' : savedCount > 0 ? `Uložené (${savedCount})` : 'Uložené'}
          </button>
        </div>
      </nav>

      <main id="main-content" className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">
        {!showSaved && (
          <>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Ověření firmy</h1>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Rejstřík ARES · lokální SQLite cache
              </p>
            </div>

            <SearchForm onSearch={handleSearch} loading={loading} />

            {sqlite.initError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400">
                Databázi se nepodařilo inicializovat: {sqlite.initError}. Data nebudou ukládána
                lokálně.
              </div>
            )}

            <div role="status" aria-live="polite" aria-atomic="true">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
                  {error}
                </div>
              )}
              {result && !error && (
                <span className="sr-only">Firma {result.company.obchodniJmeno} byla nalezena.</span>
              )}
            </div>

            {loading && <SearchSkeleton />}
            {!result && !loading && !error && <HeroIllustration />}

            {result && (
              <div key={result.company.ico} className="animate-fade-in-up flex flex-col gap-6">
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
          <div className="animate-fade-in-up flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Uložené firmy</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Firmy uložené do vaší lokální SQLite databáze.
              </p>
            </div>
            <SavedCompanies onSelect={handleSelectSaved} savedVersion={savedVersion} />
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
