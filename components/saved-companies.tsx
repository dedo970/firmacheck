'use client';

import { useState } from 'react';
import { useSQLite } from '@/lib/sqlite-provider';
import { toCSV, toJSON, downloadFile } from '@/lib/export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SavedCompaniesProps {
  onSelect: (ico: string) => void;
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

export function SavedCompanies({ onSelect }: SavedCompaniesProps) {
  const { getSavedCompanies, removeCompany, ready } = useSQLite();
  const [copied, setCopied] = useState(false);

  if (!ready) return null;

  const companies = getSavedCompanies();

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[var(--muted)]">
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
    navigator.clipboard.writeText(toJSON(companies)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="border-[var(--border)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold">
            {companies.length} {companies.length === 1 ? 'firma' : companies.length < 5 ? 'firmy' : 'firem'}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs h-7 gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1v7M3.5 6L6 8.5 8.5 6M2 10.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON} className="text-xs h-7 gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1v7M3.5 6L6 8.5 8.5 6M2 10.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyJSON} className="text-xs h-7 gap-1.5 min-w-[110px]">
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Zkopírováno
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <rect x="4.5" y="4.5" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M7.5 4.5V3a1 1 0 00-1-1h-5a1 1 0 00-1 1v7a1 1 0 001 1h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
          {companies.map((c) => (
            <li
              key={c.ico}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface)] transition-colors group"
            >
              {/* Avatar */}
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 select-none ${getAvatarColor(c.ico)}`}
                aria-hidden="true"
              >
                {getInitials(c.obchodniJmeno)}
              </div>

              {/* Info */}
              <button
                className="cursor-pointer flex-1 text-left min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                onClick={() => onSelect(c.ico)}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm truncate">{c.obchodniJmeno}</span>
                  <span className="font-mono text-xs text-[var(--muted)] shrink-0">{c.ico}</span>
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5 truncate">
                  {c.adresa && `${c.adresa} · `}
                  Ověřeno {new Date(c.lastVerifiedAt).toLocaleDateString('cs-CZ')}
                </div>
              </button>

              {/* Ghost delete — visible on hover/focus */}
              <button
                onClick={() => removeCompany(c.ico)}
                className="cursor-pointer p-1.5 text-[var(--muted)] hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] shrink-0"
                aria-label={`Odebrat ${c.obchodniJmeno}`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
