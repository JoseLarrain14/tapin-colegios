import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware - Route Protection
 *
 * Protects dashboard routes from unauthenticated access.
 * Redirects to /login if no auth token is found.
 *
 * Protected routes: All routes except /login and public assets
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get token from cookie
  const token = request.cookies.get('tapin-auth-token')?.value

  // Public routes that don't require authentication
  const isPublicRoute = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api')
  const isStaticFile = pathname.startsWith('/_next') || pathname.startsWith('/static')

  // Allow access to public routes and static files
  if (isPublicRoute || isApiRoute || isStaticFile) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  const isAuthenticated = !!token

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Allow authenticated users to access protected routes
  return NextResponse.next()
}

/**
 * Matcher configuration - Apply middleware to all routes except static files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
