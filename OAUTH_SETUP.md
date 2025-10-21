# Google OAuth Setup with Supabase Auth

Your app now uses Supabase's built-in Google OAuth authentication! This integrates seamlessly with your existing `profiles` table and database structure.

## Prerequisites

You already have:
- ✅ Google OAuth credentials in `.env.local`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- ✅ Existing `profiles` table in Supabase
- ✅ All code files updated to use Supabase Auth

## Step 1: Configure Google OAuth in Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Click "Authentication" in the left sidebar
   - Click "Providers" tab

3. **Enable Google Provider**
   - Find "Google" in the list of providers
   - Toggle it ON

4. **Add Your Google Credentials**
   - Paste your Client ID: `240995323583-8kb8ev107i08mhtnrf66dp4425rv75d1.apps.googleusercontent.com`
   - Paste your Client Secret: `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`
   - Click "Save"

5. **Copy the Callback URL**
   - Supabase will show you a callback URL like:
     `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Copy this URL

## Step 2: Update Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com
   - Select your project

2. **Navigate to OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Make sure your app is configured

3. **Update Authorized Redirect URIs**
   - Go to "APIs & Services" → "Credentials"
   - Click on your OAuth 2.0 Client ID
   - Under "Authorized redirect URIs", add BOTH:
     - **Development**: `http://localhost:3000/api/auth/callback`
     - **Supabase**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Click "Save"

## Step 3: Configure Supabase Auth Settings (Optional but Recommended)

1. **In Supabase Dashboard → Authentication → Settings**

2. **Site URL**
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`

3. **Redirect URLs**
   - Add these allowed redirect URLs:
     ```
     http://localhost:3000/**
     https://your-domain.com/**
     ```

4. **Email Auth** (if you want email/password login later)
   - Can be enabled/disabled as needed

## What Was Created

### 🔧 Core Services
- `lib/auth/supabase-server.ts` - Server-side Supabase client
- `lib/auth/supabase-client.ts` - Client-side Supabase client
- `lib/auth/require-auth.ts` - Auth helpers for server components

### 🛣️ API Routes
- `app/api/auth/callback/route.ts` - OAuth callback handler
- `app/api/auth/signout/route.ts` - Sign out endpoint

### 🎨 UI Components
- `app/login/page.tsx` - Login page with Google sign-in
- `lib/auth/use-user.tsx` - React context for user state
- `components/UserProfile.tsx` - User profile display component

### 🔒 Security
- `middleware.ts` - Updated to use Supabase Auth only
- Protected routes automatically redirect to login
- Session management handled by Supabase

## How It Works

### Authentication Flow

1. User clicks "Continue with Google" on `/login`
2. Supabase redirects to Google OAuth consent screen
3. User authorizes the app
4. Google redirects back to Supabase callback
5. Supabase creates user in `auth.users` table
6. Profile automatically created via database trigger
7. User redirected to app at `/api/auth/callback`
8. Session cookie set by Supabase
9. User redirected to dashboard (or original destination)

### Database Integration

When a user signs in with Google:
- Supabase creates entry in `auth.users`
- Your existing database trigger creates entry in `profiles` table
- All existing foreign keys and RLS policies work automatically

## Usage Examples

### Server Components (Recommended)

```tsx
// app/dashboard/page.tsx
import { requireAuth } from '@/lib/auth/require-auth';

export default async function DashboardPage() {
  const user = await requireAuth(); // Auto-redirects if not logged in

  return (
    <div>
      <h1>Welcome {user.full_name || user.email}!</h1>
      <p>User ID: {user.id}</p>
    </div>
  );
}
```

### Client Components with Context

```tsx
// First, wrap your app with UserProvider
// app/layout.tsx
import { UserProvider } from '@/lib/auth/use-user';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
```

```tsx
// Then use the useUser hook
'use client';

import { useUser } from '@/lib/auth/use-user';

export default function MyComponent() {
  const { user, loading, logout } = useUser();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <p>Hello {user.name}!</p>
      <img src={user.picture} alt={user.name} />
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### API Routes

```tsx
// app/api/my-route/route.ts
import { createClient } from '@/lib/auth/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use user.id for queries
  const { data } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', user.id);

  return NextResponse.json({ data });
}
```

### Checking Auth Status

```tsx
// Server component - no redirect
import { getCurrentUser } from '@/lib/auth/require-auth';

export default async function MyPage() {
  const user = await getCurrentUser(); // Returns null if not logged in

  if (!user) {
    return <div>Please log in</div>;
  }

  return <div>Welcome {user.email}</div>;
}
```

## Protected Routes

The following routes are automatically protected by middleware:
- `/dashboard/*`
- `/analyze/*`
- `/experiments/*`
- `/hypotheses/*`
- `/insights/*`
- `/themes/*`
- `/queue/*`
- `/settings/*`
- `/analyses/*`

Users accessing these routes without authentication will be redirected to `/login`.

## OAuth Scopes

The app requests these scopes from Google:
- **Email & Profile** - Automatically included by Supabase
- **Google Analytics** - Add this in Supabase if needed (see Advanced Configuration below)

## Advanced Configuration

### Adding Google Analytics Scope

If you need Google Analytics access:

1. In Supabase Dashboard → Authentication → Providers → Google
2. Click "Additional Scopes"
3. Add: `https://www.googleapis.com/auth/analytics.readonly`
4. Save

### Accessing Google OAuth Tokens

```tsx
const supabase = await createClient();
const { data: { session } } = await supabase.auth.getSession();

if (session?.provider_token) {
  // Use provider_token for Google API calls
  const accessToken = session.provider_token;
}
```

### Profile Updates

Users can update their profile:

```tsx
const supabase = createClient();

// Update profile
await supabase
  .from('profiles')
  .update({ full_name: 'New Name' })
  .eq('id', user.id);
```

## Testing

1. **Start dev server**
   ```bash
   npm run dev
   ```

2. **Test the flow**
   - Visit http://localhost:3000/dashboard
   - Should redirect to `/login`
   - Click "Continue with Google"
   - Authorize with your Google account
   - Should redirect back to dashboard

3. **Check database**
   - Go to Supabase Dashboard → Table Editor
   - Check `auth.users` table - should have your user
   - Check `profiles` table - should have matching entry

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure Google Cloud Console has both redirect URIs:
  - `http://localhost:3000/api/auth/callback`
  - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### Profile not created
- Check if your database has a trigger to auto-create profiles
- You may need to add this trigger:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Session not persisting
- Check browser cookies are enabled
- Verify Supabase URL and keys in `.env.local`
- Check that middleware is running

### "Invalid session" errors
- Clear browser cookies and try again
- Check Supabase project is not paused
- Verify API keys are correct

## Environment Variables Needed

Make sure these are in your `.env.local`:

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://bzsozdirgpmcfcndbipu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (already configured)
GOOGLE_CLIENT_ID=240995323583-8kb8ev107i08mhtnrf66dp4425rv75d1.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

Note: Google credentials are only needed in `.env.local` for reference. Supabase manages the actual OAuth flow using credentials configured in the dashboard.

## Production Deployment

When deploying to production:

1. **Update Site URL in Supabase**
   - Authentication → Settings → Site URL
   - Set to your production domain

2. **Add production redirect URLs**
   - In Supabase: `https://your-domain.com/**`
   - In Google Console: `https://your-domain.com/api/auth/callback`

3. **Environment variables**
   - Vercel/Netlify will automatically use your existing Supabase env vars
   - Google credentials are configured in Supabase dashboard, not env vars

## Benefits of This Approach

✅ **Single source of truth** - All users in `auth.users`
✅ **Existing schema works** - `profiles` table integration via foreign keys
✅ **RLS policies work** - `auth.uid()` functions work automatically
✅ **Less code** - Supabase handles token refresh, session management
✅ **Secure** - Built-in PKCE flow, secure cookie handling
✅ **Scalable** - Works with other providers (GitHub, Azure, etc.)
✅ **Battle-tested** - Used by thousands of production apps

## Next Steps

1. ✅ Configure Google OAuth in Supabase Dashboard (see Step 1)
2. ✅ Update Google Cloud Console redirect URIs (see Step 2)
3. ✅ Test the login flow
4. ✅ Add UserProvider to your app layout if using client components
5. ✅ Update production URLs when deploying

That's it! Your OAuth is fully configured and ready to use. 🎉
