'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

function LoginContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const next = searchParams.get('next') || '/dashboard';
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(errorParam);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      router.push(next);
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';

      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else if (errorMessage.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
          scopes: 'https://www.googleapis.com/auth/analytics.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        setError('Failed to sign in with Google. Please try again.');
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to sign in with Google. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex justify-center mb-6 group">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-gold to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-gold/20 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-brand-gold/30 group-hover:scale-105">
              <span className="text-3xl font-black text-white">G</span>
            </div>
          </Link>
          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
            Welcome back
          </h1>
          <p className="text-base text-gray-600">
            Sign in to continue to Galo CRO
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 backdrop-blur-sm">
          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-6 shadow-sm hover:shadow"
          >
            {googleLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form className="space-y-5" onSubmit={handleEmailLogin}>
            <div>
              <label htmlFor="email-address" className="block text-sm font-semibold text-gray-900 mb-2">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition-all duration-200 sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition-all duration-200 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 transition-all duration-200 hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="font-bold text-gray-900 hover:text-brand-gold transition-colors duration-200"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
