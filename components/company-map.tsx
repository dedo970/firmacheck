'use client';

import dynamic from 'next/dynamic';
import type { GeoPoint } from '@/types';
import { MapErrorBoundary } from './map-error-boundary';

interface CompanyMapProps {
  geo: GeoPoint;
  companyName: string;
}

const MapInner = dynamic(() => import('./company-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">
      Načítám mapu…
    </div>
  ),
});

export function CompanyMap({ geo, companyName }: CompanyMapProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-[var(--muted)] uppercase">
          Sídlo firmy
        </p>
        <p className="mt-0.5 text-sm font-medium">{companyName}</p>
      </div>
      <MapErrorBoundary>
        <MapInner geo={geo} companyName={companyName} />
      </MapErrorBoundary>
    </div>
  );
}
