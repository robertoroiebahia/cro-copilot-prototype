'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Cache timestamp to prevent excessive calls
  const [lastFetch, setLastFetch] = useState<number>(0);
  const CACHE_DURATION = 60000; // 1 minute cache

  const fetchSession = async (forceRefresh = false) => {
    const now = Date.now();

    // Use cache if recent fetch and not forcing refresh
    if (!forceRefresh && now - lastFetch < CACHE_DURATION && session) {
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Auth session error:', sessionError);
        setError(sessionError.message);
        setSession(null);
        setUser(null);
      } else {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setError(null);
        setLastFetch(now);
      }
    } catch (err) {
      console.error('Auth fetch error:', err);
      setError(err instanceof Error ? err.message : 'Authentication error');
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial session fetch
  useEffect(() => {
    fetchSession();
  }, []);

  // Listen to auth changes (sign in, sign out, token refresh)
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state change:', event);

      // Update state based on auth event
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLastFetch(Date.now());

      // Handle specific events
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setError(null);
        // Redirect to login if on protected route
        const isProtectedRoute = pathname && !pathname.startsWith('/login') && !pathname.startsWith('/signup') && pathname !== '/';
        if (isProtectedRoute) {
          router.push('/login');
        }
      } else if (event === 'SIGNED_IN') {
        setError(null);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'USER_UPDATED') {
        console.log('User updated');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setError(null);
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
    }
  };

  const refreshSession = async () => {
    await fetchSession(true);
  };

  const value = {
    user,
    session,
    isLoading,
    error,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
