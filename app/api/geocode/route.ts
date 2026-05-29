import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT_MS = 8000;
const MAX_ADDRESS_LENGTH = 500;
const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };
const NOMINATIM_CONTACT = process.env.NOMINATIM_CONTACT ?? '';

export async function GET(request: NextRequest) {
  // x-real-ip is set by Vercel's edge and cannot be spoofed.
  // Fallback to 'unknown' (not x-forwarded-for, which is client-controlled).
  const ip = request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit(`${ip}:geo`, 20)) {
    return NextResponse.json(
      { error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' },
      { status: 429 },
    );
  }

  const address = request.nextUrl.searchParams.get('address');
  if (!address || address.length > MAX_ADDRESS_LENGTH) {
    return NextResponse.json({ error: 'Neplatná adresa' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(NOMINATIM);
    url.searchParams.set('q', `${address}, Česká republika`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'cz');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': `FirmaCheck/1.0${NOMINATIM_CONTACT ? ` (contact: ${NOMINATIM_CONTACT})` : ''}`,
        'Accept-Language': 'cs',
      },
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding selhal' }, { status: 502 });
    }

    const results = await res.json();
    if (!results.length) {
      return NextResponse.json({ error: 'Adresa nenalezena' }, { status: 404 });
    }

    const lat = parseFloat(results[0].lat);
    const lng = parseFloat(results[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Geocoding vrátil neplatné souřadnice' }, { status: 502 });
    }
    return NextResponse.json({ lat, lng }, NO_STORE);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Geocoding neodpověděl včas' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Geocoding nedostupný' }, { status: 503 });
  } finally {
    clearTimeout(timeoutId);
  }
}
