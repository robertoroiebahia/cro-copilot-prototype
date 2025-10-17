import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  const hasValidUrl =
    typeof supabaseUrl === 'string' &&
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://'));

  if (!hasValidUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      console.warn(
        'Supabase environment variables are not set. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }
    return null;
  }

  return createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  });
};
