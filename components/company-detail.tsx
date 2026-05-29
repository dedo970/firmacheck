import { SourceBadge } from './source-badge';
import { NameMatchBadge } from './name-match-badge';
import { matchNames } from '@/lib/name-match';
import type { CompanyResult } from '@/types';

interface CompanyDetailProps {
  result: CompanyResult;
  nameQuery: string;
  onSave: () => void;
  isSaved: boolean;
  onRefresh?: () => void;
}

function formatDate(isoDate: string): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString('cs-CZ');
  } catch {
    return isoDate;
  }
}

const STATUS_DOT: Record<string, string> = {
  'Aktivní': 'bg-emerald-500', 'AKTIVNI': 'bg-emerald-500',
  'V likvidaci': 'bg-amber-500', 'V_LIKVIDACI': 'bg-amber-500',
  'Zaniklý': 'bg-red-500', 'ZANIKLY': 'bg-red-500',
  'V insolvenci': 'bg-red-500', 'V_INSOLVENCI': 'bg-red-500',
  'Pozastavena': 'bg-gray-400', 'POZASTAVENA': 'bg-gray-400',
};

const STATUS_TEXT: Record<string, string> = {
  'Aktivní': 'text-emerald-600 dark:text-emerald-400', 'AKTIVNI': 'text-emerald-600 dark:text-emerald-400',
  'V likvidaci': 'text-amber-600 dark:text-amber-400', 'V_LIKVIDACI': 'text-amber-600 dark:text-amber-400',
  'Zaniklý': 'text-red-600 dark:text-red-400', 'ZANIKLY': 'text-red-600 dark:text-red-400',
  'V insolvenci': 'text-red-600 dark:text-red-400', 'V_INSOLVENCI': 'text-red-600 dark:text-red-400',
  'Pozastavena': 'text-gray-500 dark:text-gray-400', 'POZASTAVENA': 'text-gray-500 dark:text-gray-400',
};

const STATUS_STRIP: Record<string, string> = {
  'Aktivní': 'bg-emerald-500', 'AKTIVNI': 'bg-emerald-500',
  'V likvidaci': 'bg-amber-500', 'V_LIKVIDACI': 'bg-amber-500',
  'Zaniklý': 'bg-red-500', 'ZANIKLY': 'bg-red-500',
  'V insolvenci': 'bg-red-500', 'V_INSOLVENCI': 'bg-red-500',
  'Pozastavena': 'bg-gray-400', 'POZASTAVENA': 'bg-gray-400',
};

export function CompanyDetail({ result, nameQuery, onSave, isSaved, onRefresh }: CompanyDetailProps) {
  const { company, aresSource, geo, geoSource } = result;
  const nameMatch = nameQuery ? matchNames(nameQuery, company.obchodniJmeno) : null;
  const dotColor = STATUS_DOT[company.stavSubjektu] ?? 'bg-gray-400';
  const textColor = STATUS_TEXT[company.stavSubjektu] ?? 'text-[var(--muted)]';
  const stripColor = STATUS_STRIP[company.stavSubjektu] ?? 'bg-[var(--border)]';

  const fields = [
    { label: 'Právní forma', value: company.pravniForma || '—' },
    { label: 'Datum vzniku', value: formatDate(company.datumVzniku) },
    { label: 'Adresa sídla', value: company.adresa || '—' },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Status strip */}
      <div className={`h-0.5 w-full ${stripColor}`} />

      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold tracking-tight leading-snug">
              {company.obchodniJmeno}
            </h2>
            <p className="flex items-center gap-2 mt-1 text-xs font-mono text-[var(--muted)]">
              <span>IČO {company.ico}</span>
              {company.dic && (
                <>
                  <span className="text-[var(--border)]">·</span>
                  <span>DIČ {company.dic}</span>
                </>
              )}
            </p>
          </div>
          <div className={`inline-flex items-center gap-1.5 text-xs font-medium shrink-0 ${textColor}`}>
            <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
            {company.stavSubjektu}
          </div>
        </div>
      </div>

      {/* Data rows */}
      <div className="border-t border-[var(--border)]">
        {fields.map(({ label, value }) => (
          <div
            key={label}
            className="flex gap-4 px-5 py-3 border-b border-[var(--border)] last:border-b-0"
          >
            <span className="text-xs text-[var(--muted)] w-28 shrink-0 pt-px">{label}</span>
            <span className="text-sm">{value}</span>
          </div>
        ))}
      </div>

      {/* Name match */}
      {nameMatch && nameQuery && (
        <div className="px-5 py-3 border-t border-[var(--border)]">
          <NameMatchBadge result={nameMatch} input={nameQuery} aresName={company.obchodniJmeno} />
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <SourceBadge label="ARES" source={aresSource} />
          {geoSource && <SourceBadge label="Geo" source={geoSource} />}
          {geo && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lng}&zoom=16`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              {geo.lat.toFixed(4)}°N {geo.lng.toFixed(4)}°E ↗
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          {aresSource === 'cache' && onRefresh && (
            <button
              onClick={onRefresh}
              className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              ↻ Obnovit
            </button>
          )}
          <button
            onClick={onSave}
            disabled={isSaved}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              isSaved
                ? 'cursor-default border-[var(--border)] text-[var(--muted)]'
                : 'cursor-pointer border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'
            }`}
          >
            {isSaved ? '✓ Uloženo' : '+ Uložit'}
          </button>
        </div>
      </div>
    </div>
  );
}
