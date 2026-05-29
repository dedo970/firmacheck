import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';

  // Nonce-based CSP is incompatible with statically pre-rendered pages — the
  // nonce can't be injected into build-time HTML, so 'strict-dynamic' would
  // block all scripts. Using 'self' without nonce is the correct approach here.
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://*.tile.openstreetmap.org data: blob:",
    "connect-src 'self'",
    "font-src 'self'",
    "worker-src blob: 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  const response = NextResponse.next({ request });
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon\\.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
