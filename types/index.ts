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

export interface SavedCompany extends AresCompany {
  lat?: number;
  lng?: number;
  savedAt: number;
  lastVerifiedAt: number;
  source: DataSource;
}

export type NameMatchResult = 'exact' | 'partial' | 'none';
