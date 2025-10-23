# 📋 Manual Setup Steps - Billing System

**Created:** October 22, 2025
**Status:** Awaiting Manual Execution

---

## ✅ What's Already Done

- [x] Pricing strategy defined (Free $0, Pro $79/mo, Enterprise custom)
- [x] Database schema created (migration file ready)
- [x] TypeScript types created
- [x] React hooks created (useSubscription, useWorkspaceUsage, useActionLimit)
- [x] Usage tracking utilities built
- [x] Helper functions implemented

---

## 🔴 Action Required: Manual Steps

### Step 1: Run Database Migration in Supabase

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard
   - Navigate to your project

2. **Open SQL Editor:**
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New query"

3. **Copy Migration SQL:**
   - Open the file: `/Users/robertobahia/Projects/cro-copilot-prototype/supabase/migrations/013_billing_and_usage_system.sql`
   - Copy ALL the contents (it's a large file with tables, functions, triggers, etc.)

4. **Paste and Run:**
   - Paste the SQL into the Supabase SQL editor
   - Click "Run" or press `Cmd+Enter`
   - Wait for it to complete (should take 2-3 seconds)

5. **Verify Tables Created:**
   - Go to "Table Editor" in Supabase dashboard
   - You should now see these new tables:
     - `pricing_plans` (with 3 rows: free, pro, enterprise)
     - `subscriptions`
     - `usage_tracking`

---

### Step 2: Create Stripe Account

1. **Sign up for Stripe:**
   - Go to: https://dashboard.stripe.com/register
   - Fill in your business information
   - Verify your email

2. **Get API Keys (Test Mode):**
   - In Stripe Dashboard, go to: Developers → API Keys
   - Copy these keys:
     - **Publishable key:** `pk_test_...`
     - **Secret key:** `sk_test_...`

3. **Add Keys to Environment Variables:**
   - Open: `/Users/robertobahia/Projects/cro-copilot-prototype/.env.local`
   - Add these lines:
     ```bash
     # Stripe Keys (Test Mode)
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
     STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
     STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
     ```

4. **Create Products in Stripe:**
   - Go to: Products → + Add Product
   - Create two products:

     **Product 1: Pro Plan**
     - Name: "Pro Plan"
     - Description: "For growing teams and agencies"
     - Price: $79.00 / month (recurring)
     - Copy the Price ID (starts with `price_...`)

     **Product 2: Pro Plan (Annual)**
     - Name: "Pro Plan (Annual)"
     - Description: "Annual billing - save 2 months"
     - Price: $790.00 / year (recurring)
     - Copy the Price ID (starts with `price_...`)

5. **Update Pricing Plans Table:**
   - Go back to Supabase → SQL Editor
   - Run this SQL to add Stripe IDs:
     ```sql
     UPDATE pricing_plans
     SET
       stripe_product_id = 'prod_YOUR_PRODUCT_ID',
       stripe_price_id_monthly = 'price_YOUR_MONTHLY_PRICE_ID',
       stripe_price_id_annual = 'price_YOUR_ANNUAL_PRICE_ID'
     WHERE id = 'pro';
     ```

---

## 📄 Files Created (Ready to Use)

### 1. Database Migration
- **Location:** `supabase/migrations/013_billing_and_usage_system.sql`
- **Purpose:** Creates all billing tables, functions, triggers
- **Action:** Copy and paste into Supabase SQL Editor

### 2. Pricing Strategy Document
- **Location:** `docs/PRICING_STRATEGY.md`
- **Purpose:** Defines tiers, limits, features, upgrade CTAs
- **Action:** Review and adjust pricing if needed

### 3. TypeScript Types
- **Location:** `lib/types/billing.types.ts`
- **Purpose:** Type definitions for pricing plans, subscriptions, usage
- **Action:** Import and use in components

### 4. Usage Tracking Utilities
- **Location:** `lib/billing/usage-tracking.ts`
- **Purpose:** Functions to track and check usage limits
- **Functions:**
  - `incrementUsage()` - Call after creating analyses/insights/etc
  - `checkUsageLimit()` - Call before allowing new resource creation
  - `canPerformAction()` - Combines feature check + usage limit check
  - `isFeatureAvailable()` - Check if user's plan includes a feature

### 5. React Hooks
- **Location:** `lib/billing/useSubscription.ts`
- **Hooks:**
  - `useSubscription()` - Get user's current subscription and plan
  - `useWorkspaceUsage()` - Get current usage for a workspace
  - `useActionLimit()` - Check if user can perform an action

---

## 🔧 Example Usage in Your Code

### Example 1: Check if User Can Create Analysis

```typescript
import { canPerformAction } from '@/lib/billing/usage-tracking';
import { incrementUsage } from '@/lib/billing/usage-tracking';

async function createAnalysis(userId: string, workspaceId: string, url: string) {
  // 1. Check if user can create analysis
  const check = await canPerformAction(userId, workspaceId, 'analyses', 'page_analysis');

  if (!check.allowed) {
    // Show upgrade modal
    alert(check.reason);
    return;
  }

  // 2. Create the analysis
  const analysis = await createAnalysisInDatabase(url);

  // 3. Increment usage counter
  await incrementUsage(workspaceId, userId, 'analyses', 'page_analysis');

  return analysis;
}
```

### Example 2: Use Subscription Hook in Component

```typescript
import { useSubscription } from '@/lib/billing/useSubscription';

function AnalyzePage() {
  const { subscription, isPro, hasFeature, loading } = useSubscription();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Create Analysis</h1>

      {/* Show research type options based on plan */}
      <div>
        <button>Page Analysis</button> {/* Always available */}
        <button>GA4 Analysis</button> {/* Always available */}

        {hasFeature('review_mining') ? (
          <button>Review Mining</button>
        ) : (
          <button onClick={() => showUpgradeModal()}>
            Review Mining 🔒 (Pro only)
          </button>
        )}
      </div>

      {/* Show current plan */}
      <p>Current Plan: {subscription?.plan_name}</p>
    </div>
  );
}
```

### Example 3: Show Usage Stats

```typescript
import { useWorkspaceUsage } from '@/lib/billing/useSubscription';

function UsageDashboard({ workspaceId }) {
  const { usage, loading } = useWorkspaceUsage(workspaceId);
  const { subscription } = useSubscription();

  if (loading) return <div>Loading...</div>;

  const limit = subscription?.limits?.analyses_per_month || 5;
  const current = usage?.analyses_count || 0;
  const remaining = limit === -1 ? 'Unlimited' : Math.max(0, limit - current);

  return (
    <div>
      <h2>Monthly Usage</h2>
      <p>Analyses: {current} / {limit === -1 ? 'Unlimited' : limit}</p>
      <p>Remaining: {remaining}</p>

      {current >= limit && limit !== -1 && (
        <button onClick={() => navigate('/settings/billing')}>
          Upgrade Plan
        </button>
      )}
    </div>
  );
}
```

---

## ✅ Verification Checklist

After completing the manual steps, verify:

- [ ] All 3 tables exist in Supabase (pricing_plans, subscriptions, usage_tracking)
- [ ] `pricing_plans` table has 3 rows (free, pro, enterprise)
- [ ] Stripe account is created and in test mode
- [ ] Stripe API keys are added to `.env.local`
- [ ] Pro plan products created in Stripe
- [ ] Stripe IDs updated in `pricing_plans` table

---

## 🚀 Next Steps (After Manual Setup)

Once you've completed the manual steps above, ping me and I'll continue with:

1. **Integrate Stripe SDK** - Add Stripe checkout flow
2. **Add Usage Tracking Calls** - Insert tracking in analysis creation
3. **Build Upgrade CTAs** - Add "Upgrade" prompts throughout app
4. **Create `/settings/billing` page** - Show subscription, usage, upgrade options
5. **Create `/settings/usage` page** - Detailed usage breakdown
6. **Implement Feature Gating** - Lock features based on plan

---

**Questions?** Let me know if you need help with any of these steps!
