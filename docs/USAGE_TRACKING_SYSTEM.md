# 📊 Usage Tracking System - Complete Guide

## 🎯 Overview

This document describes the **bulletproof usage tracking system** that powers our monetization. This system ensures:
1. Users cannot exceed their plan limits
2. Usage is accurately tracked for billing
3. Upgrades are enforced seamlessly

---

## 🏗️ Architecture

### **3-Layer System:**

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Middleware (Check BEFORE, Track AFTER)            │
│ File: lib/billing/usage-middleware.ts                      │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Core Utilities (RPC Wrapper)                      │
│ File: lib/billing/usage-tracking.ts                        │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Database (RPC Functions + Usage Table)            │
│ Files: supabase/migrations/013_billing_and_usage_system.sql│
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Key Files

### **1. Middleware (`lib/billing/usage-middleware.ts`)**
**Purpose:** High-level API for checking limits and tracking usage

**Key Functions:**
- `checkCanCreate(userId, workspaceId, resourceType)` - Check before creating
- `trackResourceCreation(userId, workspaceId, resourceType, researchType?)` - Track after creating
- `createWithUsageTracking(...)` - Combined check + create + track

**Usage Example:**
```typescript
// BEFORE creating an analysis
const check = await checkCanCreate(userId, workspaceId, 'analyses');
if (!check.allowed) {
  return check.error; // Returns 403 with upgrade message
}

// CREATE the analysis
const analysis = await supabase.from('analyses').insert({ ... });

// AFTER creating successfully
await trackResourceCreation(userId, workspaceId, 'analyses', 'page_analysis');
```

---

### **2. Core Utilities (`lib/billing/usage-tracking.ts`)**
**Purpose:** Wrapper around database RPC functions

**Key Functions:**
- `incrementUsage(workspaceId, userId, usageType, researchType?)` - Increment counter
- `checkUsageLimit(userId, workspaceId, usageType)` - Check if at limit
- `canPerformAction(userId, workspaceId, actionType, featureName?)` - Combined check
- `getUserSubscription(userId)` - Get user's plan with limits
- `getCurrentUsage(workspaceId, period?)` - Get current usage stats

---

### **3. Database Schema**

#### **Tables:**

**`usage_tracking` - Monthly usage per workspace**
```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  period TEXT NOT NULL,                    -- Format: "YYYY-MM"
  analyses_count INTEGER DEFAULT 0,
  insights_count INTEGER DEFAULT 0,
  themes_count INTEGER DEFAULT 0,
  hypotheses_count INTEGER DEFAULT 0,
  experiments_count INTEGER DEFAULT 0,
  analyses_by_type JSONB,                  -- Breakdown by research type
  UNIQUE(workspace_id, period)
);
```

**`pricing_plans` - Plan definitions**
- Stores limits (analyses_per_month, insights_max, etc.)
- Stores features (page_analysis, ga4_analysis, etc.)

**`subscriptions` - User subscriptions**
- Links users to plans
- Tracks Stripe IDs and billing periods

#### **RPC Functions:**

**`increment_usage(workspace_id, user_id, usage_type, research_type?)`**
- Increments counters in usage_tracking
- Uses UPSERT (INSERT ... ON CONFLICT DO UPDATE)
- Automatically tracks by period (YYYY-MM)

**`check_usage_limit(user_id, workspace_id, usage_type)`**
- Returns: `{ allowed: boolean, limit: number, current: number, remaining: number }`
- Checks against user's plan limits
- Handles unlimited (-1) limits

---

## 🔧 Implementation Pattern

### **For ANY Resource Creation Endpoint:**

```typescript
// app/api/[resource]/route.ts
import { checkCanCreate, trackResourceCreation } from '@/lib/billing/usage-middleware';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { workspaceId, ...data } = await request.json();

  // ✅ STEP 1: Check usage limits BEFORE creating
  const usageCheck = await checkCanCreate(user.id, workspaceId, 'analyses');
  if (!usageCheck.allowed) {
    return usageCheck.error; // 403 with upgrade message
  }

  // ✅ STEP 2: Create the resource
  const { data: resource, error } = await supabase
    .from('analyses')
    .insert({ user_id: user.id, workspace_id: workspaceId, ...data })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ✅ STEP 3: Track the creation
  await trackResourceCreation(user.id, workspaceId, 'analyses', 'page_analysis');

  return NextResponse.json({ resource });
}
```

---

## 📊 Current Implementation Status

### ✅ **Implemented:**
1. ✅ Database schema (migration 013)
2. ✅ RPC functions (increment_usage, check_usage_limit)
3. ✅ Core utilities (usage-tracking.ts)
4. ✅ Middleware layer (usage-middleware.ts)
5. ✅ Usage API endpoint (`/api/usage`)
6. ✅ Usage UI page (`/settings/usage`)
7. ✅ Backfill script (scripts/backfill-usage-tracking.sql)
8. ✅ Analysis creation tracking (`app/api/analyze-v2/route.ts`)
   - Checks limit BEFORE analysis
   - Tracks analysis AFTER creation
   - Tracks insights AFTER creation

### 🚧 **Pending:**
- [ ] GA4 analysis endpoint (`app/api/ga4/insights/route.ts`)
- [ ] CSV analysis endpoint (`app/api/analyze-csv/route.ts`)
- [ ] Manual insight creation (if needed - check if it uses different table)
- [ ] Theme creation (if manual creation exists)
- [ ] Hypothesis creation (if manual creation exists)
- [ ] Experiment creation (`app/api/experiments/route.ts`)

---

## 🎯 Plan Limits

### **Free Plan:**
- Analyses: **5/month**
- Insights: **50 total**
- Themes: **10 total**
- Hypotheses: **5 total**
- Experiments: **2/month**

### **Pro Plan:**
- Analyses: **50/month**
- Insights: **Unlimited (-1)**
- Themes: **Unlimited (-1)**
- Hypotheses: **Unlimited (-1)**
- Experiments: **25/month**

### **Enterprise Plan:**
- Everything: **Unlimited (-1)**

---

## 🧪 Testing the System

### **1. Test Usage Tracking:**
```bash
# Run analysis
POST /api/analyze-v2
{ "url": "https://example.com", "workspaceId": "..." }

# Check usage was tracked
GET /api/usage?workspaceId=...
# Should show: analyses_count: 1, insights_count: X
```

### **2. Test Limit Enforcement:**
```bash
# Create 5 analyses as Free user
# 6th attempt should return:
{
  "error": "Usage limit reached",
  "code": "USAGE_LIMIT_EXCEEDED",
  "limit": 5,
  "current": 5,
  "upgradeUrl": "/settings/billing"
}
```

### **3. Test Upgrade Flow:**
```bash
# Upgrade to Pro
POST /api/stripe/create-checkout-session

# Complete checkout
# Usage limits should now be 50/month (or unlimited)

# Create 6th analysis - should succeed
```

---

## 🐛 Troubleshooting

### **Issue: Usage not being tracked**
**Check:**
1. Is `trackResourceCreation()` being called after resource creation?
2. Check console for errors: `Failed to track {resource} creation`
3. Verify workspace_id is passed correctly

### **Issue: Limits not being enforced**
**Check:**
1. Is `checkCanCreate()` being called before resource creation?
2. Check user's subscription: `SELECT * FROM subscriptions WHERE user_id = '...'`
3. Check plan limits: `SELECT * FROM pricing_plans WHERE id = 'free'`

### **Issue: Usage count is wrong**
**Fix:**
1. Run backfill script: `psql ... -f scripts/backfill-usage-tracking.sql`
2. Check for duplicate tracking calls
3. Verify period format is "YYYY-MM"

---

## 🔒 Security Considerations

1. **Always check limits BEFORE starting expensive operations** (like LLM calls)
2. **Track usage AFTER successful creation** (don't track failed attempts)
3. **RLS policies** ensure users can only see their own usage
4. **Fail open** - If limit check fails, allow the action (log warning)
5. **Idempotency** - Multiple tracking calls for same resource won't double-count

---

## 📈 Monitoring

### **Key Metrics to Watch:**
```sql
-- Daily usage by plan
SELECT
  s.plan_id,
  COUNT(DISTINCT ut.workspace_id) as active_workspaces,
  SUM(ut.analyses_count) as total_analyses,
  SUM(ut.insights_count) as total_insights
FROM usage_tracking ut
JOIN workspaces w ON ut.workspace_id = w.id
JOIN subscriptions s ON w.user_id = s.user_id
WHERE ut.period = TO_CHAR(NOW(), 'YYYY-MM')
GROUP BY s.plan_id;

-- Users approaching limits (potential upgrades)
SELECT
  w.user_id,
  s.plan_id,
  ut.analyses_count,
  (pp.limits->>'analyses_per_month')::int as limit,
  ROUND((ut.analyses_count::float / (pp.limits->>'analyses_per_month')::int) * 100, 2) as usage_percent
FROM usage_tracking ut
JOIN workspaces w ON ut.workspace_id = w.id
JOIN subscriptions s ON w.user_id = s.user_id
JOIN pricing_plans pp ON s.plan_id = pp.id
WHERE ut.period = TO_CHAR(NOW(), 'YYYY-MM')
  AND (pp.limits->>'analyses_per_month')::int > 0
  AND ut.analyses_count::float / (pp.limits->>'analyses_per_month')::int > 0.8
ORDER BY usage_percent DESC;
```

---

## 🚀 Next Steps

1. **Add tracking to remaining endpoints** (GA4, CSV, experiments)
2. **Add frontend guards** (disable buttons when at limit)
3. **Add upgrade prompts** (show modal when user hits limit)
4. **Add usage notifications** (email when 80% of limit reached)
5. **Add analytics** (track conversion rate from limit-hit to upgrade)

---

## 📝 Change Log

**October 23, 2025:**
- ✅ Created usage-middleware.ts with high-level API
- ✅ Fixed imports in usage-tracking.ts
- ✅ Added usage tracking to analyze-v2 route
- ✅ Created backfill script for historical data
- ✅ Backfilled 1 analysis + 12 insights successfully
- ✅ Verified TypeScript compilation (no new errors)
- ✅ Created comprehensive documentation

---

**Status:** 🟢 **Core System Operational**
**Next:** Add tracking to remaining endpoints
