import {
  createServerActionClient,
  createServerComponentClient,
} from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const createClient = () =>
  createServerComponentClient({
    cookies,
  });

export const createActionClient = () => {
  const cookieStore = cookies();
  return createServerActionClient({
    cookies: () => cookieStore,
  });
};
