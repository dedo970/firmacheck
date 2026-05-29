'use client';

import { useState, type FormEvent } from 'react';
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
      {/* Primary row */}
      <div className="flex gap-2">
        <div
          className={`flex flex-1 overflow-hidden rounded-lg border transition-colors ${
            error
              ? 'border-[var(--danger)]'
              : 'border-[var(--border)] focus-within:border-[var(--accent)]'
          }`}
        >
          <span className="flex items-center px-3 text-xs font-mono font-semibold text-[var(--muted)] bg-[var(--surface)] border-r border-[var(--border)] shrink-0 select-none">
            IČO
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="12345678"
            autoFocus
            value={ico}
            onChange={(e) => { setIco(e.target.value); setError(''); }}
            maxLength={8}
            className="flex-1 bg-transparent px-3 py-2 text-sm font-mono outline-none placeholder:text-[var(--muted)] min-w-0"
            aria-label="IČO firmy"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Načítám…
            </>
          ) : 'Ověřit'}
        </button>
      </div>

      {error && <p className="text-xs text-[var(--danger)] -mt-1">{error}</p>}

      {/* Secondary: optional name */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-[var(--muted)] shrink-0 select-none">Název</span>
        <input
          type="text"
          placeholder="volitelné — pro porovnání s ARES"
          value={name}
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] pb-1 text-sm outline-none placeholder:text-[var(--muted)]/60 transition-colors"
          aria-label="Název firmy"
        />
      </div>
    </form>
  );
}
