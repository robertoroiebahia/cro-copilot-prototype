# CRO Copilot - Setup Guide

## Overview

Your CRO Copilot app now has user authentication and database storage for landing page analyses. This guide walks you through setting up the database schema in Supabase.

---

## 🚀 Quick Start

### 1. Run Database Migration

You need to execute the SQL migration file in your Supabase project to create the necessary tables and policies.

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/bzsozdirgpmcfcndbipu
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link your project
supabase link --project-ref bzsozdirgpmcfcndbipu

# Run the migration
supabase db push
```

---

### 2. Verify Database Setup

After running the migration, verify that the tables were created:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see two new tables:
   - `profiles` - User profile information
   - `analyses` - Saved landing page analyses

---

### 3. Test the Authentication Flow

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Create a test account:**
   - Visit: http://localhost:3000/signup
   - Sign up with an email and password
   - You'll be auto-redirected to the dashboard

3. **Test login:**
   - Sign out from the dashboard
   - Visit: http://localhost:3000/login
   - Log in with your credentials

4. **Run an analysis:**
   - From the dashboard, click "New Analysis"
   - Enter a landing page URL and metrics
   - The analysis will be saved to your database

5. **View saved analyses:**
   - Go to: http://localhost:3000/dashboard
   - You should see your saved analyses
   - Click any analysis to view full details

---

## 📊 Database Schema

### Tables

#### `profiles`
- Extends Supabase `auth.users`
- Stores user profile info
- Auto-created on user signup via trigger

#### `analyses`
- Stores all landing page analysis results
- Includes: URL, metrics, context, screenshots, AI insights
- Protected by RLS (users only see their own data)

### Row-Level Security (RLS)

All tables have RLS policies that ensure:
- Users can only view their own analyses
- Users can only create/update/delete their own data
- Server-side session validation prevents unauthorized access

---

## 🔐 Security Features

### ✅ What's Protected

1. **API Routes:**
   - `/api/analyze` requires authentication
   - Returns 401 if not logged in

2. **Protected Pages:**
   - `/dashboard` - redirects to `/login` if not authenticated
   - `/dashboard/[id]` - only shows user's own analyses

3. **Middleware:**
   - Validates sessions on every request
   - Redirects unauthenticated users from protected routes
   - Redirects authenticated users away from login/signup

---

## 🛠️ Environment Variables

Your `.env.local` should have:

```bash
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_SUPABASE_URL=https://bzsozdirgpmcfcndbipu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**Note:** Never commit `.env.local` to version control!

---

## 📁 New File Structure

```
app/
├── (auth)/
│   ├── login/page.tsx           # Login page
│   └── signup/page.tsx          # Signup page
├── dashboard/
│   ├── page.tsx                 # Analysis history
│   └── [id]/page.tsx            # Individual analysis detail
├── api/
│   └── analyze/route.ts         # ✨ Now saves to database
lib/
└── types/
    └── database.types.ts        # TypeScript types for DB
supabase/
└── migrations/
    └── 001_initial_schema.sql   # Database schema
middleware.ts                    # ✨ Updated with auth logic
```

---

## 🧪 Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Sign up a new user
- [ ] Verify `profiles` table has new row
- [ ] Run a landing page analysis
- [ ] Verify `analyses` table has new row
- [ ] View analysis in dashboard
- [ ] Click into analysis detail page
- [ ] Sign out and verify redirect to login
- [ ] Try accessing `/dashboard` without login (should redirect)
- [ ] Test RLS by trying to view another user's analysis ID (should 404)

---

## 🔧 Troubleshooting

### Issue: "Unauthorized" error on `/api/analyze`

**Solution:** Make sure you're logged in. The analyze API now requires authentication.

### Issue: No analyses showing in dashboard

**Solution:**
1. Check that the migration ran successfully
2. Verify RLS policies are active
3. Check browser console for errors

### Issue: Can't sign up / login

**Solution:**
1. Verify your Supabase credentials in `.env.local`
2. Check Supabase Dashboard → Authentication → Settings
3. Ensure email auth is enabled

### Issue: Database save failing

**Solution:**
1. Check Supabase logs: Dashboard → Logs → Postgres
2. Verify the `analyses` table exists
3. Confirm user is authenticated (check server logs)

---

## 🎯 Next Steps

Now that you have user authentication and database storage working, you can add:

1. **Usage Tracking:**
   - Track OpenAI API costs per user
   - Add credit/quota system
   - Usage analytics dashboard

2. **Team Features:**
   - Share analyses with teammates
   - Invite collaborators
   - Organization management

3. **Billing Integration:**
   - Stripe subscription
   - Pay-per-analysis model
   - Usage-based pricing

4. **Export Features:**
   - PDF reports
   - CSV exports
   - Slack/email notifications

5. **Admin Dashboard:**
   - View all users
   - Monitor costs
   - Feature flags

Let me know which feature you want to build next!

---

## 📚 Useful Commands

```bash
# Start dev server
npm run dev

# Type check
npm run build

# View Supabase logs (if using CLI)
supabase logs

# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id bzsozdirgpmcfcndbipu > lib/types/database.types.ts
```

---

## 🆘 Need Help?

If you run into issues:
1. Check Supabase Dashboard logs
2. Check browser console for errors
3. Check Next.js server logs (`npm run dev` output)
4. Verify all environment variables are set correctly

Happy building! 🚀
