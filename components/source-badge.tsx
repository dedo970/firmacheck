import type { DataSource } from '@/types';

interface SourceBadgeProps {
  label: string;
  source: DataSource;
}

export function SourceBadge({ label, source }: SourceBadgeProps) {
  const isCache = source === 'cache';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isCache ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />
      {label}
      <span className={`font-medium ${isCache ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
        {isCache ? 'cache' : 'live'}
      </span>
    </span>
  );
}
