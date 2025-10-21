import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export interface UserSession {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

/**
 * Require authentication for a page or API route
 * Use this in Server Components or Server Actions
 */
export async function requireAuth(): Promise<UserSession> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email!,
    full_name: profile?.full_name,
    avatar_url: profile?.avatar_url,
  };
}

/**
 * Check if user is authenticated (doesn't redirect)
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user !== null;
}

/**
 * Get current user or null
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email!,
    full_name: profile?.full_name,
    avatar_url: profile?.avatar_url,
  };
}
