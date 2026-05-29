import { NextRequest, NextResponse } from 'next/server';
import { validateIco, normalizeIco } from '@/lib/validate-ico';
import { checkRateLimit } from '@/lib/rate-limit';

const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty';
const TIMEOUT_MS = 8000;
const NO_STORE = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' }, { status: 429 });
  }

  const ico = request.nextUrl.searchParams.get('ico');
  if (!ico || !/^\d{1,8}$/.test(ico)) {
    return NextResponse.json({ error: 'Neplatné IČO' }, { status: 400 });
  }

  const paddedIco = normalizeIco(ico);
  if (!validateIco(paddedIco)) {
    return NextResponse.json({ error: 'Neplatné IČO (nesprávný kontrolní součet)' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${ARES_BASE}/${paddedIco}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    if (res.status === 404) {
      return NextResponse.json({ error: 'Firma nebyla nalezena' }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Chyba ARES API' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data, NO_STORE);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'ARES API neodpovědělo včas' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Nepodařilo se spojit s ARES' }, { status: 503 });
  } finally {
    clearTimeout(timeoutId);
  }
}
