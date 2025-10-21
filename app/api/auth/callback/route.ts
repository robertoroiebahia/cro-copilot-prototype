import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';

    if (code) {
      const supabase = createRouteHandlerClient({ cookies });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(
          new URL(`/login?error=authentication_failed`, request.url)
        );
      }

      if (data.session) {
        // Successfully authenticated, redirect to next page
        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';

        if (isLocalEnv) {
          return NextResponse.redirect(`http://localhost:3000${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(new URL(next, request.url));
        }
      }
    }

    // No code provided
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  } catch (error) {
    console.error('Unexpected callback error:', error);
    return NextResponse.redirect(new URL('/login?error=authentication_failed', request.url));
  }
}
