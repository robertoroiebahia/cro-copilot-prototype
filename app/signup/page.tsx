'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function SignupPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const next = searchParams.get('next') || '/dashboard';
  const router = useRouter();
  const supabase = createClient();

  // State for email/password signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(errorParam);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Sign up with email and password
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setError('Please check your email to confirm your account.');
        setLoading(false);
        return;
      }

      // If session exists, user is logged in
      if (data.session) {
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during signup';

      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        setError('Too many signup attempts. Please wait a few minutes and try again.');
      } else if (errorMessage.includes('already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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
        setError('Failed to sign up with Google. Please try again.');
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Failed to sign up with Google. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-brand-gold rounded-[4px] flex items-center justify-center">
              <span className="text-2xl font-black text-brand-black">G</span>
            </div>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">
            Create your account
          </h2>
          <p className="text-sm text-gray-600">
            Start optimizing your conversions today
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-brand-surface rounded-[4px] shadow-sm border border-gray-200 p-8">
          {/* Error Message */}
          {error && (
            <div className="rounded-[4px] bg-red-50 border border-red-200 p-4 mb-6">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          )}

          {/* Google Sign Up Button */}
          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-[4px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {googleLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Sign up with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-brand-surface text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form className="space-y-6" onSubmit={handleEmailSignup}>
            <div>
              <label htmlFor="full-name" className="block text-sm font-bold text-gray-900 mb-2">
                Full name
              </label>
              <input
                id="full-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-[4px] placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:border-brand-gold transition-all duration-200 sm:text-sm"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email-address" className="block text-sm font-bold text-gray-900 mb-2">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-[4px] placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:border-brand-gold transition-all duration-200 sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-[4px] placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:border-brand-gold transition-all duration-200 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="group relative w-full flex justify-center items-center gap-2 py-2.5 px-4 text-sm font-black rounded-[4px] text-white bg-black focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20 transition-all duration-300"
                onMouseEnter={(e) => {
                  if (!loading && !googleLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    e.currentTarget.style.backgroundColor = '#1A1A1A';
                    e.currentTarget.style.boxShadow = '0 20px 50px -10px rgba(212, 165, 116, 0.6), 0 0 0 2px rgba(212, 165, 116, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && !googleLoading) {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.backgroundColor = '#0E0E0E';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold transition-all duration-200"
              style={{ color: '#0E0E0E' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#D4A574';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#0E0E0E';
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
