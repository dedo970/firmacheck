// types/index.ts

export interface AresCompany {
  ico: string;
  obchodniJmeno: string;
  pravniForma: string;
  datumVzniku: string;
  stavSubjektu: string;
  adresa: string;
  dic?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type DataSource = 'api' | 'cache';

export interface CompanyResult {
  company: AresCompany;
  aresSource: DataSource;
  geo?: GeoPoint;
  geoSource?: DataSource;
}

export interface SavedCompany {
  ico: string;
  obchodniJmeno: string;
  pravniForma: string;
  stavSubjektu: string;
  adresa: string;
  datumVzniku: string;
  dic?: string;
  lat?: number;
  lng?: number;
  savedAt: number;
  lastVerifiedAt: number;
  source: DataSource;
}

export type NameMatchResult = 'exact' | 'partial' | 'none';
