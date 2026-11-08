import { NextRequest, NextResponse } from 'next/server';

// Route classification ------------------------------------------------------

/** Visiting these without a session cookie redirects to /login (prefix match). */
const PROTECTED_PREFIXES = [
  '/invoices',
  '/quotes',
  '/clients',
  '/receipts',
  '/dashboard',
  '/settings',
  '/payments',
  '/profile', // new: the profile page
];

/** Setup needs a session too, but there is no page to come back to afterwards. */
const SESSION_ONLY_PREFIXES = ['/onboarding'];

/** Visiting these WITH a session cookie redirects to /dashboard. */
const AUTH_ROUTES = ['/login', '/signup'];

/** Public document portals: always reachable. */
const PUBLIC_PREFIXES = ['/i/', '/q/', '/r/'];

const SESSION_COOKIE = 'bagg_session';

// Edge-safe check: cookie presence only (no database). A cookie can still be
// stale or expired, which the app handles when an API call returns 401
// (see SessionGuard) and which is why /login?expired=1 must never bounce away.
const hasSessionCookie = (request: NextRequest) => Boolean(request.cookies.get(SESSION_COOKIE)?.value);

const isProtected = (pathname: string) =>
    !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

const isSessionOnly = (pathname: string) => SESSION_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
const isAuthRoute = (pathname: string) => AUTH_ROUTES.some((r) => pathname.startsWith(r));

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const authenticated = hasSessionCookie(request);

  // 1. Signed-in users do not need the login page. The exception is a session the
  //    app just found to be expired: let them reach /login to sign in again.
  if (isAuthRoute(pathname) && authenticated && !searchParams.has('expired')) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  // 2. Signed-out users on protected pages go to /login and come back afterwards.
  if (isProtected(pathname) && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    // BUG FIX: searchParams.set() already encodes the value. The old code encoded it
    // first, so it was encoded twice, the login page rejected it, and everyone landed on
    // /dashboard instead of the page they asked for.
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (isSessionOnly(pathname) && !authenticated) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)'],
};
