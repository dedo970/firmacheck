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

export function formatDate(isoDate: string): string {
  if (!isoDate) return '—';
  try {
    // Parse date-only strings (YYYY-MM-DD) as local time to avoid UTC midnight shifting the date
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return isoDate;
    return new Date(y, m - 1, d).toLocaleDateString('cs-CZ');
  } catch {
    return isoDate;
  }
}

type StatusConfig = { dot: string; text: string; strip: string };

const STATUS_CONFIG: Record<string, StatusConfig> = {
  AKTIVNI: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    strip: 'bg-emerald-500',
  },
  V_LIKVIDACI: {
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    strip: 'bg-amber-500',
  },
  ZANIKLY: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', strip: 'bg-red-500' },
  V_INSOLVENCI: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', strip: 'bg-red-500' },
  POZASTAVENA: {
    dot: 'bg-gray-400',
    text: 'text-gray-500 dark:text-gray-400',
    strip: 'bg-gray-400',
  },
};

export function normalizeStatus(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/\s+/g, '_');
}

export function CompanyDetail({
  result,
  nameQuery,
  onSave,
  isSaved,
  onRefresh,
}: CompanyDetailProps) {
  const { company, aresSource, geo, geoSource } = result;
  const nameMatch = nameQuery ? matchNames(nameQuery, company.obchodniJmeno) : null;
  const status = STATUS_CONFIG[normalizeStatus(company.stavSubjektu)];
  const dotColor = status?.dot ?? 'bg-gray-400';
  const textColor = status?.text ?? 'text-[var(--muted)]';
  const stripColor = status?.strip ?? 'bg-[var(--border)]';

  const fields = [
    { label: 'Právní forma', value: company.pravniForma || '—' },
    { label: 'Datum vzniku', value: formatDate(company.datumVzniku) },
    { label: 'Adresa sídla', value: company.adresa || '—' },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      {/* Status strip */}
      <div className={`h-0.5 w-full ${stripColor}`} />

      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-snug font-semibold tracking-tight">
              {company.obchodniJmeno}
            </h2>
            <p className="mt-1 flex items-center gap-2 font-mono text-xs text-[var(--muted)]">
              <span>IČO {company.ico}</span>
              {company.dic && (
                <>
                  <span className="text-[var(--border)]">·</span>
                  <span>DIČ {company.dic}</span>
                </>
              )}
            </p>
          </div>
          <div
            className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${textColor}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
            {company.stavSubjektu}
          </div>
        </div>
      </div>

      {/* Data rows */}
      <div className="border-t border-[var(--border)]">
        {fields.map(({ label, value }) => (
          <div
            key={label}
            className="flex gap-4 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
          >
            <span className="w-28 shrink-0 pt-px text-xs text-[var(--muted)]">{label}</span>
            <span className="text-sm">{value}</span>
          </div>
        ))}
      </div>

      {/* Name match */}
      {nameMatch && nameQuery && (
        <div className="border-t border-[var(--border)] px-5 py-3">
          <NameMatchBadge result={nameMatch} input={nameQuery} aresName={company.obchodniJmeno} />
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <SourceBadge label="ARES" source={aresSource} />
          {geoSource && <SourceBadge label="Geo" source={geoSource} />}
          {geo && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lng}&zoom=16`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            >
              {geo.lat.toFixed(4)}°N {geo.lng.toFixed(4)}°E ↗
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          {aresSource === 'cache' && onRefresh && (
            <button
              onClick={onRefresh}
              className="cursor-pointer rounded text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none"
            >
              ↻ Obnovit
            </button>
          )}
          <button
            onClick={onSave}
            disabled={isSaved}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none ${
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
