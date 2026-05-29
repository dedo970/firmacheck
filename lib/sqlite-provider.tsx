'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Database } from 'sql.js';
import { openDB, type IDBPDatabase } from 'idb';
import type { AresCompany, DataSource, GeoPoint, SavedCompany } from '@/types';

const IDB_DB_NAME = 'firmacheck-v1';
const IDB_STORE = 'sqlitedb';
const IDB_KEY = 'main';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS ares_cache (
    ico TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'api',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS geocode_cache (
    address TEXT PRIMARY KEY,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS saved_companies (
    ico TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    saved_at INTEGER NOT NULL,
    last_verified_at INTEGER NOT NULL,
    source TEXT NOT NULL
  );
`;

interface SQLiteContextValue {
  ready: boolean;
  getAresCache: (ico: string) => AresCompany | null;
  setAresCache: (ico: string, company: AresCompany) => void;
  getGeocodeCache: (address: string) => GeoPoint | null;
  setGeocodeCache: (address: string, geo: GeoPoint) => void;
  getSavedCompanies: () => SavedCompany[];
  saveCompany: (company: AresCompany, geo: GeoPoint | undefined, source: DataSource) => void;
  updateSavedCompany: (ico: string, company: AresCompany, geo: GeoPoint | undefined, source: DataSource) => void;
  removeCompany: (ico: string) => void;
  isCompanySaved: (ico: string) => boolean;
}

const SQLiteContext = createContext<SQLiteContextValue | null>(null);

export function SQLiteProvider({ children }: { children: React.ReactNode }) {
  const dbRef = useRef<Database | null>(null);
  const idbRef = useRef<IDBPDatabase | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const initSqlJs = (await import('sql.js')).default;
      const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });

      const idb = await openDB(IDB_DB_NAME, 1, {
        upgrade(d) { d.createObjectStore(IDB_STORE); },
      });
      idbRef.current = idb;

      const saved = await idb.get(IDB_STORE, IDB_KEY);
      const db = saved ? new SQL.Database(saved) : new SQL.Database();
      db.run(INIT_SQL);
      dbRef.current = db;

      // Prune expired cache entries on startup to prevent unbounded growth
      const cutoff = Date.now() - CACHE_TTL_MS;
      db.run('DELETE FROM ares_cache WHERE created_at < ?', [cutoff]);
      db.run('DELETE FROM geocode_cache WHERE created_at < ?', [cutoff]);

      setReady(true);
    })();
  }, []);

  function persist() {
    if (!dbRef.current || !idbRef.current) return;
    const data = dbRef.current.export();
    idbRef.current.put(IDB_STORE, data, IDB_KEY);
  }

  function getAresCache(ico: string): AresCompany | null {
    if (!dbRef.current) return null;
    const stmt = dbRef.current.prepare('SELECT data, created_at FROM ares_cache WHERE ico = :ico');
    const result = stmt.getAsObject({ ':ico': ico });
    stmt.free();
    if (!result.data) return null;
    if (Date.now() - (result.created_at as number) > CACHE_TTL_MS) return null;
    return JSON.parse(result.data as string) as AresCompany;
  }

  function setAresCache(ico: string, company: AresCompany) {
    if (!dbRef.current) return;
    dbRef.current.run(
      'INSERT OR REPLACE INTO ares_cache (ico, data, source, created_at) VALUES (?, ?, ?, ?)',
      [ico, JSON.stringify(company), 'api', Date.now()]
    );
    persist();
  }

  function getGeocodeCache(address: string): GeoPoint | null {
    if (!dbRef.current) return null;
    const stmt = dbRef.current.prepare('SELECT lat, lng, created_at FROM geocode_cache WHERE address = :addr');
    const result = stmt.getAsObject({ ':addr': address });
    stmt.free();
    if (result.lat === undefined) return null;
    if (Date.now() - (result.created_at as number) > CACHE_TTL_MS) return null;
    return { lat: result.lat as number, lng: result.lng as number };
  }

  function setGeocodeCache(address: string, geo: GeoPoint) {
    if (!dbRef.current) return;
    dbRef.current.run(
      'INSERT OR REPLACE INTO geocode_cache (address, lat, lng, created_at) VALUES (?, ?, ?, ?)',
      [address, geo.lat, geo.lng, Date.now()]
    );
    persist();
  }

  function getSavedCompanies(): SavedCompany[] {
    if (!dbRef.current) return [];
    const stmt = dbRef.current.prepare(
      'SELECT data, saved_at, last_verified_at, source FROM saved_companies ORDER BY saved_at DESC'
    );
    const rows: SavedCompany[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const base = JSON.parse(row.data as string) as AresCompany & { lat?: number; lng?: number };
      rows.push({
        ...base,
        savedAt: row.saved_at as number,
        lastVerifiedAt: row.last_verified_at as number,
        source: row.source as DataSource,
      });
    }
    stmt.free();
    return rows;
  }

  function saveCompany(company: AresCompany, geo: GeoPoint | undefined, source: DataSource) {
    if (!dbRef.current) return;
    const data = JSON.stringify({ ...company, lat: geo?.lat, lng: geo?.lng });
    const now = Date.now();
    dbRef.current.run(
      'INSERT OR REPLACE INTO saved_companies (ico, data, saved_at, last_verified_at, source) VALUES (?, ?, ?, ?, ?)',
      [company.ico, data, now, now, source]
    );
    persist();
  }

  function updateSavedCompany(ico: string, company: AresCompany, geo: GeoPoint | undefined, source: DataSource) {
    if (!dbRef.current) return;
    const data = JSON.stringify({ ...company, lat: geo?.lat, lng: geo?.lng });
    dbRef.current.run(
      'UPDATE saved_companies SET data = ?, last_verified_at = ?, source = ? WHERE ico = ?',
      [data, Date.now(), source, ico]
    );
    persist();
  }

  function removeCompany(ico: string) {
    if (!dbRef.current) return;
    dbRef.current.run('DELETE FROM saved_companies WHERE ico = ?', [ico]);
    persist();
  }

  function isCompanySaved(ico: string): boolean {
    if (!dbRef.current) return false;
    const stmt = dbRef.current.prepare('SELECT 1 FROM saved_companies WHERE ico = :ico');
    stmt.bind({ ':ico': ico });
    const found = stmt.step();
    stmt.free();
    return found;
  }

  return (
    <SQLiteContext.Provider value={{
      ready,
      getAresCache, setAresCache,
      getGeocodeCache, setGeocodeCache,
      getSavedCompanies, saveCompany, updateSavedCompany, removeCompany, isCompanySaved,
    }}>
      {children}
    </SQLiteContext.Provider>
  );
}

export function useSQLite(): SQLiteContextValue {
  const ctx = useContext(SQLiteContext);
  if (!ctx) throw new Error('useSQLite must be inside SQLiteProvider');
  return ctx;
}
