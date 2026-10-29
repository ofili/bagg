import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

/**
 * Protected routes – visiting without an active session redirects to /login.
 * Uses prefix matching so /invoices, /invoices/123, etc. all match.
 */
const PROTECTED_PREFIXES = [
  '/invoices',
  '/quotes',
  '/clients',
  '/receipts',
  '/dashboard',
  '/settings',
  '/payments',
];

/**
 * Auth routes – visiting with an active session redirects to /dashboard.
 */
const AUTH_ROUTES = ['/login', '/signup'];

/** Public document portals – always accessible regardless of session. */
const PUBLIC_PREFIXES = ['/i/', '/q/', '/r/'];

const SESSION_COOKIE = 'bagg_session';

// ---------------------------------------------------------------------------
// Edge-safe session check (no DB – just cookie presence)
// ---------------------------------------------------------------------------
function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(SESSION_COOKIE)?.value);
}

function isProtected(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((r) => pathname.startsWith(r));
}

// ---------------------------------------------------------------------------
// Security headers applied to every response
// ---------------------------------------------------------------------------
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  return response;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = hasSessionCookie(request);

  // 1. Authenticated users visiting login/signup → send to dashboard
  if (isAuthRoute(pathname) && authenticated) {
    const destination = new URL('/dashboard', request.url);
    return applySecurityHeaders(NextResponse.redirect(destination));
  }

  // 2. Unauthenticated users visiting protected routes → redirect to login
  if (isProtected(pathname) && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    // Preserve intended destination for post-login redirect
    const safePath = encodeURIComponent(pathname + request.nextUrl.search);
    loginUrl.searchParams.set('next', safePath);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // 3. Pass through all other requests with security headers
  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, opengraph images, public assets
     * - API routes proxied to backend (/api/*)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
};
