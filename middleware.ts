import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createMiddlewareClient({
    req: request,
    res: response,
  });

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Protected routes that require authentication
    const protectedRoutes = [
      '/dashboard',
      '/api/analyze',
      '/analyze',
      '/experiments',
      '/hypotheses',
      '/insights',
      '/themes',
      '/queue',
      '/settings',
      '/analyses',
      '/onboarding'
    ];
    const isProtectedRoute = protectedRoutes.some(route =>
      request.nextUrl.pathname.startsWith(route)
    );

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/login', request.url);
      if (request.nextUrl.pathname !== '/') {
        redirectUrl.searchParams.set('next', request.nextUrl.pathname);
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect to dashboard if accessing auth pages with active session
    const authRoutes = ['/login', '/signup'];
    const isAuthRoute = authRoutes.some(route =>
      request.nextUrl.pathname === route
    );

    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (error) {
    console.error('Middleware auth error:', error);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, fonts, etc.)
     * - api routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    '/dashboard/:path*',
    '/analyze/:path*',
    '/queue/:path*',
    '/api/analyze/:path*',
  ],
};
