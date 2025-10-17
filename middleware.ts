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
    const protectedRoutes = ['/dashboard', '/api/analyze', '/analyze'];
    const isProtectedRoute = protectedRoutes.some(route =>
      request.nextUrl.pathname.startsWith(route)
    );

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/login', request.url);
      if (request.nextUrl.pathname !== '/') {
        redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
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
    console.error('Supabase middleware error:', error);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
