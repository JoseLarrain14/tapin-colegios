import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Protected routes that require authentication
 */
const protectedRoutes = [
  '/students',
  '/recharge',
  '/profile',
  '/cafeteria',
  '/history',
  '/wallet-history',
  '/spending-stats',
  '/payment-history',
  '/notifications',
  '/coupons',
  '/help',
];

/**
 * Auth routes that should redirect to home if already authenticated
 */
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

/**
 * Check if the given pathname matches any route in the list
 * Supports both exact matches and path prefixes
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    // Exact match
    if (pathname === route) return true;
    // Path prefix match (e.g., /register/step2 matches /register)
    if (pathname.startsWith(route + '/')) return true;
    return false;
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookie
  const authToken = request.cookies.get('auth_token')?.value;
  const isAuthenticated = !!authToken;

  // Check if trying to access protected route without authentication
  if (matchesRoute(pathname, protectedRoutes)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check if trying to access auth routes while already authenticated
  if (matchesRoute(pathname, authRoutes)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 * Excludes static files, images, and service worker
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (icons, manifest, etc.)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|workbox-).*)',
  ],
};
