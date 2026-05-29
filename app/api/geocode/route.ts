import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT_MS = 8000;
const MAX_ADDRESS_LENGTH = 500;
const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip, 20)) {
    return NextResponse.json({ error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' }, { status: 429 });
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
        'User-Agent': 'FirmaCheck/1.0 (github.com/firmacheck)',
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

    const { lat, lon } = results[0];
    return NextResponse.json({ lat: parseFloat(lat), lng: parseFloat(lon) }, NO_STORE);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Geocoding neodpověděl včas' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Geocoding nedostupný' }, { status: 503 });
  } finally {
    clearTimeout(timeoutId);
  }
}
