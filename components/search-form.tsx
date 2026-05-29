'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { validateIco, normalizeIco } from '@/lib/validate-ico';

interface SearchFormProps {
  onSearch: (ico: string, name: string) => void;
  loading: boolean;
}

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [ico, setIco] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) {
      inputRef.current?.focus();
    }
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = ico.trim();
    if (!validateIco(trimmed)) {
      setError('Zadejte platné IČO (1–8 číslic, kontrolní součet musí sedět).');
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
          <label
            htmlFor="ico-input"
            className="flex shrink-0 cursor-text items-center border-r border-[var(--border)] bg-[var(--surface)] px-3 font-mono text-xs font-semibold text-[var(--muted)] select-none"
          >
            IČO
          </label>
          <input
            ref={inputRef}
            id="ico-input"
            type="text"
            inputMode="numeric"
            placeholder="12345678"
            value={ico}
            onChange={(e) => {
              setIco(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
            maxLength={8}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:text-[var(--muted)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <svg
                className="h-3.5 w-3.5 shrink-0 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Načítám…
            </>
          ) : (
            'Ověřit'
          )}
        </button>
      </div>

      {error && <p className="-mt-1 text-xs text-[var(--danger)]">{error}</p>}

      {/* Secondary: optional name */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="name-input"
          className="shrink-0 cursor-text font-mono text-xs text-[var(--muted)] select-none"
        >
          Název
        </label>
        <input
          id="name-input"
          type="text"
          placeholder="volitelné — pro porovnání s ARES"
          value={name}
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border-b border-[var(--border)] bg-transparent pb-1 text-sm transition-colors outline-none placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)]"
        />
      </div>
    </form>
  );
}
