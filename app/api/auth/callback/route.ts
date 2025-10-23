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
        // Check if user needs onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('id', data.session.user.id)
          .single();

        // Check if user has workspaces
        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', data.session.user.id)
          .eq('is_active', true);

        // Redirect to onboarding if:
        // 1. User hasn't completed onboarding AND
        // 2. User has no workspaces AND
        // 3. They're not already going to onboarding
        const needsOnboarding = !profile?.onboarding_completed_at &&
                               (!workspaces || workspaces.length === 0) &&
                               next !== '/onboarding';

        const redirectPath = needsOnboarding ? '/onboarding' : next;

        // Successfully authenticated, redirect to appropriate page
        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';

        if (isLocalEnv) {
          return NextResponse.redirect(`http://localhost:3000${redirectPath}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
        } else {
          return NextResponse.redirect(new URL(redirectPath, request.url));
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
