import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  const hasValidUrl =
    typeof supabaseUrl === 'string' &&
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://'));

  if (!hasValidUrl || !supabaseAnonKey) {
    console.warn(
      'Supabase environment variables are not set. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
    return null;
  }

  return createServerComponentClient(
    { cookies },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    },
  );
};
