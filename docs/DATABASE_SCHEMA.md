# CRO Copilot - Database Schema Reference

**Last Updated:** October 29, 2025
**Database:** PostgreSQL (Supabase)
**Version:** Migration 023

---

## 📋 Table of Contents

1. [Core System Tables](#core-system-tables)
2. [Workspace & User Management](#workspace--user-management)
3. [Research & Analysis](#research--analysis)
4. [Insights & Themes](#insights--themes)
5. [Experiments & Hypotheses](#experiments--hypotheses)
6. [Billing & Usage](#billing--usage)
7. [Shopify Integration](#shopify-integration)
8. [Google Analytics](#google-analytics)
9. [Row Level Security (RLS) Pattern](#row-level-security-rls-pattern)

---

## Core System Tables

### `profiles`
**Purpose:** Extends Supabase auth.users with user profile data

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Key Relationships:**
- One-to-one with `auth.users`
- One-to-many with `workspaces`
- One-to-many with `subscriptions`

---

## Workspace & User Management

### `workspaces`
**Purpose:** Multi-workspace support (PRO feature)

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- workspace owner
  name TEXT NOT NULL,
  domain TEXT,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Pattern:**
```sql
-- Users can only access their own workspaces
WHERE user_id = auth.uid()
```

**Note:** Currently uses simple owner model (user_id). There is NO `workspace_members` table yet.

---

## Research & Analysis

### `analyses`
**Purpose:** Stores all research analysis results

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  workspace_id UUID REFERENCES workspaces(id),   -- Workspace isolation

  -- Analysis type
  research_type TEXT NOT NULL,  -- 'page_analysis', 'survey_analysis', 'ga4_analysis', etc.

  -- Page-analysis specific fields (NULLABLE - only used for page_analysis type)
  url TEXT,                      -- Only for page_analysis
  metrics JSONB,                 -- Only for page_analysis
  context JSONB,                 -- Only for page_analysis

  -- Generic flexible fields (for all research types)
  input_data JSONB,              -- Flexible input data (e.g., connectionId for Shopify, propertyId for GA4)
  insights JSONB,                -- Analysis-specific insights (flexible structure per research type)

  -- Common fields
  domain TEXT,
  name TEXT,
  summary JSONB NOT NULL,        -- Required for all research types
  insights_count INTEGER DEFAULT 0,

  -- Metadata
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Research Types:**
- `page_analysis` - Visual page CRO analysis
- `survey_analysis` - Survey/feedback CSV analysis
- `review_mining` - Customer review analysis
- `onsite_poll` - Poll/exit intent analysis
- `ga4_analysis` - Google Analytics funnel analysis
- `heatmap_analysis` - Heatmap data analysis (PRO)
- `user_testing` - User testing analysis (PRO)
- `shopify_order_analysis` - Order/AOV analysis (NEW)

**RLS Pattern:**
```sql
-- Via workspace
WHERE workspace_id IN (
  SELECT id FROM workspaces WHERE user_id = auth.uid()
)

-- Via user (legacy)
WHERE user_id = auth.uid()
```

---

## Insights & Themes

### `insights`
**Purpose:** Individual CRO insights extracted from research

```sql
CREATE TABLE insights (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  analysis_id UUID REFERENCES analyses(id),

  -- Core insight
  insight_id TEXT UNIQUE,  -- e.g., "INS-SUR-1234-abcde"
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  evidence JSONB,

  -- Categorization
  research_type TEXT,
  growth_pillar TEXT NOT NULL CHECK (growth_pillar IN (
    'conversion', 'aov', 'frequency', 'retention', 'acquisition'
  )),
  confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Context
  customer_segment TEXT,
  journey_stage TEXT CHECK (journey_stage IN (
    'awareness', 'consideration', 'decision', 'post_purchase'
  )),
  page_location TEXT[],
  device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'all')),

  -- UX Analysis
  friction_type TEXT CHECK (friction_type IN (
    'usability', 'trust', 'value_perception', 'information_gap', 'cognitive_load'
  )),
  psychology_principle TEXT CHECK (psychology_principle IN (
    'loss_aversion', 'social_proof', 'scarcity', 'authority', 'anchoring'
  )),

  -- Metadata
  tags TEXT[],
  affected_kpis TEXT[],
  suggested_actions TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'archived')),
  validation_status TEXT DEFAULT 'untested',

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Key Rules:**
- `growth_pillar` is REQUIRED
- `confidence_level` and `priority` have strict enums
- Use `"N/A"` (string) for optional enum fields when AI is uncertain, NOT `null`
- Evidence should be human-friendly text, NOT JSON structures

---

### `themes`
**Purpose:** Groups related insights into strategic themes

```sql
CREATE TABLE themes (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),

  theme_id TEXT UNIQUE,
  name TEXT NOT NULL,
  statement TEXT NOT NULL,
  theme_statement TEXT,  -- Alias for statement

  -- Connected insights
  insight_ids TEXT[],

  -- Business impact
  business_impact JSONB,  -- {impact_score, affected_metrics, revenue_potential}

  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

### `hypotheses`
**Purpose:** Testable hypotheses generated from themes (PXL framework)

```sql
CREATE TABLE hypotheses (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  theme_id UUID REFERENCES themes(id),

  -- Hypothesis
  statement TEXT NOT NULL,  -- "If [change], then [outcome] because [reasoning]"
  based_on_insight_ids TEXT[],

  -- PXL Framework
  research_backed BOOLEAN,
  research_notes TEXT,
  effort_design INTEGER CHECK (effort_design BETWEEN 1 AND 10),
  effort_dev INTEGER CHECK (effort_dev BETWEEN 1 AND 10),
  effort_copy INTEGER CHECK (effort_copy BETWEEN 1 AND 10),
  above_fold BOOLEAN,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 10),
  potential_value TEXT,  -- 'High', 'Medium', 'Low'
  ease_score INTEGER CHECK (ease_score BETWEEN 1 AND 10),

  -- Test details
  expected_impact JSONB,  -- {metric, baseline, predicted, lift, confidence}
  success_criteria JSONB,

  priority TEXT CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Experiments & Hypotheses

### `experiments`
**Purpose:** A/B tests and experimentation tracking

```sql
CREATE TABLE experiments (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  hypothesis_id UUID REFERENCES hypotheses(id),

  name TEXT NOT NULL,
  hypothesis TEXT,

  -- Test configuration
  status TEXT CHECK (status IN ('draft', 'running', 'paused', 'completed', 'concluded')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Results
  results_summary JSONB,
  variant_results JSONB[],
  winner TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Billing & Usage

### `pricing_plans`
**Purpose:** Available subscription tiers (Free, PRO, Enterprise)

```sql
CREATE TABLE pricing_plans (
  id TEXT PRIMARY KEY,  -- 'free', 'pro', 'enterprise'
  name TEXT NOT NULL,
  price_monthly INTEGER,  -- cents
  price_annual INTEGER,

  limits JSONB,    -- {analyses_per_month, insights_max, workspaces_max, ...}
  features JSONB,  -- {page_analysis: true, survey_analysis: false, ...}

  stripe_product_id TEXT,
  is_active BOOLEAN DEFAULT true
);
```

---

### `subscriptions`
**Purpose:** User subscription status

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  plan_id TEXT REFERENCES pricing_plans(id),

  status TEXT DEFAULT 'active',  -- 'active', 'cancelled', 'past_due'
  billing_cycle TEXT DEFAULT 'monthly',

  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  UNIQUE(user_id)
);
```

---

### `usage_tracking`
**Purpose:** Track monthly usage per workspace for billing limits

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES auth.users(id),

  period TEXT NOT NULL,  -- 'YYYY-MM' format

  -- Counters
  analyses_count INTEGER DEFAULT 0,
  insights_count INTEGER DEFAULT 0,
  themes_count INTEGER DEFAULT 0,
  hypotheses_count INTEGER DEFAULT 0,
  experiments_count INTEGER DEFAULT 0,

  -- Breakdown
  analyses_by_type JSONB,

  UNIQUE(workspace_id, period)
);
```

**Helper Functions:**
- `increment_usage(workspace_id, user_id, resource_type, research_type, count)`
- `check_usage_limit(workspace_id, resource_type)`

---

## Shopify Integration

### `shopify_connections`
**Purpose:** Store Shopify store connections per workspace

```sql
CREATE TABLE shopify_connections (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),

  shop_domain TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,  -- TODO: Encrypt properly
  shop_name TEXT,
  currency TEXT DEFAULT 'USD',

  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  UNIQUE(workspace_id, shop_domain)
);
```

---

### `shopify_orders`
**Purpose:** Raw Shopify order data for AOV analysis

```sql
CREATE TABLE shopify_orders (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  connection_id UUID REFERENCES shopify_connections(id),

  shopify_order_id TEXT NOT NULL,
  order_number INTEGER NOT NULL,

  -- Customer
  customer_email TEXT,
  customer_id TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,

  -- Order financials
  total_price DECIMAL(10, 2) NOT NULL,
  subtotal_price DECIMAL(10, 2),
  total_tax DECIMAL(10, 2),
  total_discounts DECIMAL(10, 2) DEFAULT 0,
  shipping_price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Status
  financial_status TEXT,
  fulfillment_status TEXT,

  -- Line items (JSONB for flexibility)
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Addresses
  shipping_address JSONB,
  billing_address JSONB,

  shopify_created_at TIMESTAMPTZ NOT NULL,
  shopify_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,

  UNIQUE(workspace_id, shopify_order_id)
);
```

**Indexes:**
- `idx_shopify_orders_workspace` on workspace_id
- `idx_shopify_orders_created` on shopify_created_at
- `idx_shopify_orders_total_price` on total_price
- `idx_shopify_orders_customer` on customer_id

---

### `order_clusters`
**Purpose:** Order value clustering results (e.g., $0-$50, $50-$100)

```sql
CREATE TABLE order_clusters (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  analysis_id UUID REFERENCES analyses(id),

  cluster_name TEXT NOT NULL,  -- e.g., "$0-$50"
  min_value DECIMAL(10, 2) NOT NULL,
  max_value DECIMAL(10, 2) NOT NULL,

  -- Statistics
  order_count INTEGER NOT NULL,
  percentage_of_orders DECIMAL(5, 2) NOT NULL,
  total_revenue DECIMAL(12, 2) NOT NULL,
  percentage_of_revenue DECIMAL(5, 2) NOT NULL,
  average_order_value DECIMAL(10, 2) NOT NULL,

  created_at TIMESTAMPTZ
);
```

---

### `product_affinity`
**Purpose:** Market basket analysis - products frequently bought together

```sql
CREATE TABLE product_affinity (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  analysis_id UUID REFERENCES analyses(id),

  product_a_id TEXT NOT NULL,
  product_a_title TEXT NOT NULL,
  product_b_id TEXT NOT NULL,
  product_b_title TEXT NOT NULL,

  -- Market basket metrics
  support DECIMAL(5, 4) NOT NULL,      -- % of orders with both
  confidence DECIMAL(5, 4) NOT NULL,   -- % of A orders that have B
  lift DECIMAL(6, 3) NOT NULL,         -- Association strength

  pair_count INTEGER NOT NULL,
  product_a_count INTEGER NOT NULL,
  product_b_count INTEGER NOT NULL,
  total_orders INTEGER NOT NULL,

  created_at TIMESTAMPTZ
);
```

---

### `aov_opportunities`
**Purpose:** Prioritized AOV optimization test ideas

```sql
CREATE TABLE aov_opportunities (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  analysis_id UUID REFERENCES analyses(id),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'free_shipping', 'bundle', 'pricing', 'cross_sell'
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Test idea
  test_idea JSONB NOT NULL,          -- {what, why, how}
  expected_impact JSONB NOT NULL,    -- {metric, baseline, predicted, lift, revenue_impact}

  -- Scores
  confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 10),
  effort_score INTEGER CHECK (effort_score BETWEEN 1 AND 10),
  revenue_impact_score INTEGER CHECK (revenue_impact_score BETWEEN 1 AND 10),

  -- Statistical readiness
  statistical_readiness JSONB,  -- {sample_size_required, test_duration_days}
  supporting_data JSONB,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'testing', 'implemented', 'dismissed')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Google Analytics

### `ga4_connections`
**Purpose:** Google Analytics 4 property connections

```sql
CREATE TABLE ga4_connections (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),

  property_id TEXT NOT NULL,
  property_name TEXT,

  -- OAuth tokens
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,

  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,

  UNIQUE(workspace_id, property_id)
);
```

---

### `ga4_raw_events`
**Purpose:** Raw GA4 event data for analysis

```sql
CREATE TABLE ga4_raw_events (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  connection_id UUID REFERENCES ga4_connections(id),

  event_name TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  user_pseudo_id TEXT,
  session_id TEXT,

  event_params JSONB,
  user_properties JSONB,

  created_at TIMESTAMPTZ,

  UNIQUE(workspace_id, connection_id, user_pseudo_id, event_timestamp, event_name)
);
```

---

## Row Level Security (RLS) Pattern

**All tables use workspace-based isolation:**

```sql
-- Standard RLS policy for all workspace-scoped tables
CREATE POLICY "Users can access data in their workspaces"
  ON {table_name} FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE user_id = auth.uid()
  ));
```

**Key Points:**
- ✅ **Always use `workspaces.user_id` for auth checks**
- ❌ **DO NOT use `workspace_members` table** (doesn't exist yet)
- ✅ **All workspace data uses `workspace_id` foreign key**
- ✅ **Auth uses Supabase `auth.uid()` function**

---

## Common Patterns

### Creating a New Analysis

**For Page Analysis:**
```typescript
const { data } = await supabase
  .from('analyses')
  .insert({
    user_id: userId,
    workspace_id: workspaceId,
    research_type: 'page_analysis',
    url: 'https://example.com',       // Page-specific
    metrics: {...},                   // Page-specific
    context: {...},                   // Page-specific
    summary: {...},
    status: 'completed'
  })
  .select()
  .single();
```

**For Shopify Analysis:**
```typescript
const { data } = await supabase
  .from('analyses')
  .insert({
    user_id: userId,
    workspace_id: workspaceId,
    research_type: 'shopify_order_analysis',
    input_data: {                     // Flexible input
      connectionId: 'xxx',
      dateRange: {...},
      shopDomain: 'store.myshopify.com'
    },
    summary: {...},
    insights: {                       // Flexible insights
      clusters: [...],
      productAffinities: [...],
      opportunities: [...]
    },
    status: 'completed'
  })
  .select()
  .single();
```

### Fetching Workspace Data
```typescript
// RLS automatically filters to user's workspaces
const { data: insights } = await supabase
  .from('insights')
  .select('*')
  .eq('workspace_id', workspaceId);
```

### Checking Feature Access
```typescript
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('plan_id, pricing_plans(*)')
  .eq('user_id', userId)
  .single();

const hasFeature = subscription.pricing_plans.features.survey_analysis;
```

---

## Migration Files Location

All schema migrations are in: `/supabase/migrations/`

**Key Migrations:**
- `001_initial_schema.sql` - Profiles, analyses
- `008_comprehensive_research_schema.sql` - Insights, themes, hypotheses
- `010_pxl_framework.sql` - PXL hypothesis framework
- `013_billing_and_usage_system.sql` - Pricing, subscriptions, usage tracking
- `021_shopify_order_analysis.sql` - Shopify integration & AOV analysis
- `022_add_flexible_analysis_fields.sql` - Add input_data and insights JSONB columns
- `023_make_analyses_flexible.sql` - Make page-analysis columns nullable

---

## Quick Reference: Table Dependencies

```
auth.users (Supabase)
  ↓
profiles
  ↓
workspaces (user_id) ────────┐
  ↓                           │
  ├─ analyses                 │
  │   ↓                       │
  │   └─ insights             │
  │       ↓                   │
  │       └─ themes           │
  │           ↓               │
  │           └─ hypotheses   │
  │               ↓           │
  │               └─ experiments
  │                           │
  ├─ shopify_connections ─────┤
  │   ↓                       │
  │   └─ shopify_orders       │
  │       ↓                   │
  │       ├─ order_clusters   │
  │       ├─ product_affinity │
  │       └─ aov_opportunities│
  │                           │
  ├─ ga4_connections ─────────┤
  │   ↓                       │
  │   └─ ga4_raw_events       │
  │                           │
  └─ usage_tracking (links to both)

subscriptions (user_id)
  ↓
pricing_plans
```

---

**💡 Pro Tip:** When in doubt, check existing migrations for patterns. All tables follow workspace isolation via `workspace_id` + RLS.

