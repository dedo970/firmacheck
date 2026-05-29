'use client';

import dynamic from 'next/dynamic';
import type { GeoPoint } from '@/types';

interface CompanyMapProps {
  geo: GeoPoint;
  companyName: string;
}

const MapInner = dynamic(
  () => import('./company-map-inner'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-sm text-[var(--muted)]">
        Načítám mapu…
      </div>
    ),
  }
);

export function CompanyMap({ geo, companyName }: CompanyMapProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Sídlo firmy</p>
        <p className="text-sm font-medium mt-0.5">{companyName}</p>
      </div>
      <MapInner geo={geo} companyName={companyName} />
    </div>
  );
}
