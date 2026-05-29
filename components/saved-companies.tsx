'use client';

import { useState, useEffect, useRef } from 'react';
import { useSQLite } from '@/lib/sqlite-provider';
import { toCSV, toJSON, downloadFile } from '@/lib/export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SavedCompany } from '@/types';

export function pluralFirma(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'firem';
  if (mod10 === 1) return 'firma';
  if (mod10 >= 2 && mod10 <= 4) return 'firmy';
  return 'firem';
}

const DELETE_DELAY_MS = 4000;

interface SavedCompaniesProps {
  onSelect: (ico: string) => void;
  savedVersion?: number;
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getAvatarColor(ico: string): string {
  const hash = ico.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function SavedCompanies({ onSelect, savedVersion }: SavedCompaniesProps) {
  const { getSavedCompanies, removeCompany, ready } = useSQLite();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready) setCompanies(getSavedCompanies());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, savedVersion]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pendingDelete) return;
    const timeout = setTimeout(() => {
      removeCompany(pendingDelete);
      setCompanies((prev) => prev.filter((c) => c.ico !== pendingDelete));
      setPendingDelete(null);
    }, DELETE_DELAY_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDelete]);

  if (!ready) {
    return <div className="py-12 text-center text-sm text-[var(--muted)]">Načítám databázi…</div>;
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-[var(--muted)]">Zatím nemáte uložené žádné firmy.</p>
        <p className="text-xs text-[var(--muted)]/70">
          Vyhledejte firmu a klikněte na{' '}
          <span className="font-medium text-[var(--foreground)]">+ Uložit</span>.
        </p>
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
    navigator.clipboard
      .writeText(toJSON(companies))
      .then(() => {
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setCopied(true);
        setCopyError(false);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setCopied(false);
        setCopyError(true);
        copyTimeoutRef.current = setTimeout(() => setCopyError(false), 3000);
      });
  }

  function handleRemove(ico: string) {
    setPendingDelete(ico);
  }

  function handleUndoDelete() {
    setPendingDelete(null);
  }

  const displayedCompanies = pendingDelete
    ? companies.filter((c) => c.ico !== pendingDelete)
    : companies;

  const pendingDeleteCompany = pendingDelete
    ? companies.find((c) => c.ico === pendingDelete)
    : null;

  return (
    <>
      {pendingDelete && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm">
          <span className="text-[var(--muted)]">
            {pendingDeleteCompany
              ? `„${pendingDeleteCompany.obchodniJmeno}“ bude odstraněna…`
              : 'Firma bude odstraněna za chvíli…'}
          </span>
          <button
            onClick={handleUndoDelete}
            className="font-medium text-[var(--accent)] transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none"
          >
            Zpět
          </button>
        </div>
      )}
      <Card className="border-[var(--border)]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">
              {companies.length} {pluralFirma(companies.length)}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-7 gap-1.5 text-xs"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 1v7M3.5 6L6 8.5 8.5 6M2 10.5h8"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="h-7 gap-1.5 text-xs"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 1v7M3.5 6L6 8.5 8.5 6M2 10.5h8"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJSON}
                className={cn(
                  'h-7 min-w-[110px] gap-1.5 text-xs',
                  copyError && 'border-[var(--danger)] text-[var(--danger)]',
                )}
              >
                {copyError ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M1 1L11 11M11 1L1 11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Selhalo
                  </>
                ) : copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Zkopírováno
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <rect
                        x="4.5"
                        y="4.5"
                        width="6"
                        height="7"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M7.5 4.5V3a1 1 0 00-1-1h-5a1 1 0 00-1 1v7a1 1 0 001 1h1.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    Kopírovat JSON
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-[var(--border)]">
            {displayedCompanies.map((c) => (
              <li
                key={c.ico}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface)]"
              >
                {/* Avatar */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold select-none ${getAvatarColor(c.ico)}`}
                  aria-hidden="true"
                >
                  {getInitials(c.obchodniJmeno)}
                </div>

                {/* Info */}
                <button
                  className="min-w-0 flex-1 cursor-pointer rounded text-left focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none"
                  onClick={() => onSelect(c.ico)}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-medium">{c.obchodniJmeno}</span>
                    <span className="shrink-0 font-mono text-xs text-[var(--muted)]">{c.ico}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
                    {c.adresa && `${c.adresa} · `}
                    Ověřeno {new Date(c.lastVerifiedAt).toLocaleDateString('cs-CZ')}
                  </div>
                </button>

                {/* Delete — visible at reduced opacity always, full on hover/focus */}
                <button
                  onClick={() => handleRemove(c.ico)}
                  className="shrink-0 cursor-pointer rounded p-1.5 text-[var(--muted)] opacity-30 transition-colors group-hover:opacity-100 hover:bg-red-50 hover:text-[var(--danger)] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:outline-none dark:hover:bg-red-950/40"
                  aria-label={`Odebrat ${c.obchodniJmeno}`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M1 1L11 11M11 1L1 11"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
