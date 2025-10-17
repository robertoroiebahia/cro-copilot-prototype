import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { type NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const hasValidUrl =
    typeof supabaseUrl === 'string' &&
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://'));

  if (!hasValidUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createMiddlewareClient(
    {
      req: request,
      res: response,
    },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    },
  );

  try {
    await supabase.auth.getSession();
  } catch (error) {
    console.error('Supabase middleware error:', error);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
