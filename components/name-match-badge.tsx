import type { NameMatchResult } from '@/types';

interface NameMatchBadgeProps {
  result: NameMatchResult;
  input: string;
  aresName: string;
}

const CONFIG = {
  exact: {
    label: 'Shoda',
    icon: '✓',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  partial: {
    label: 'Částečná shoda',
    icon: '~',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  none: {
    label: 'Neshoda',
    icon: '✕',
    className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function NameMatchBadge({ result, input, aresName }: NameMatchBadgeProps) {
  const { label, icon, className } = CONFIG[result];
  const message =
    result === 'exact'
      ? `Zadaný název „${input}" odpovídá firmě „${aresName}"`
      : result === 'partial'
        ? `Zadaný název „${input}" částečně odpovídá firmě „${aresName}"`
        : `Zadaný název „${input}" se liší od názvu uvedeného v ARES`;

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit ${className}`}>
        {icon} {label}
      </span>
      <p className="text-xs text-[var(--muted)]">{message}</p>
    </div>
  );
}
