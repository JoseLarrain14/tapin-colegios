import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Routes that require authentication
 * Users without auth_token cookie will be redirected to /login
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
 * Auth routes (login, register)
 * Users with auth_token cookie will be redirected to /
 */
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Check if the pathname matches any of the protected routes
 */
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if the pathname matches any of the auth routes
 */
function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;

  // If user is not authenticated and tries to access protected route
  if (!authToken && isProtectedRoute(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and tries to access auth routes (login/register)
  if (authToken && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|api).*)',
  ],
};
