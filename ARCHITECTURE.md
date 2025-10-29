# CRO Copilot Architecture Guide

> This document defines the canonical structure and patterns for the CRO Copilot codebase. All code changes must follow these patterns.

## Table of Contents
1. [Project Structure](#project-structure)
2. [Service Layer Architecture](#service-layer-architecture)
3. [Component Patterns](#component-patterns)
4. [API Route Patterns](#api-route-patterns)
5. [Database & Types](#database--types)
6. [Naming Conventions](#naming-conventions)
7. [Code Organization Rules](#code-organization-rules)

---

## Project Structure

```
/app                          # Next.js 14 App Router
  /api                        # API routes
    /analyze-v2               # Page analysis endpoint
    /analyze-csv              # CSV analysis endpoint
    /ga4                      # GA4-specific endpoints
      /sync                   # Sync GA4 data
      /funnels                # Get funnel data
      /insights               # Get/generate insights
      /settings               # GA4 connection settings
    /shopify                  # Shopify-specific endpoints
      /callback               # OAuth callback
      /connections            # Get/manage connections
      /sync                   # Sync order data
      /analyze                # Run AOV analysis
      /test-connection        # Test API access
    /google-analytics         # GA integration settings
    /workspaces               # Workspace management
    /experiments              # Experiment management
    /insights                 # Insights management
    /auth                     # Authentication callbacks
    /chat                     # AI chat endpoint

  /analyze                    # Analysis pages
    /page.tsx                 # Main page analysis
    /ga                       # GA4 funnel analysis
    /survey                   # Survey analysis (CSV upload)
    /onsite-poll              # Onsite poll analysis (CSV upload)
    /review-mining            # Review mining (CSV upload)
    /shopify-orders           # Shopify AOV analysis
    /heatmap                  # Heatmap analysis (coming soon)
    /user-testing             # User testing (coming soon)
    /competitor               # Competitor analysis (coming soon)

  /analyses                   # All analyses view
  /dashboard                  # Dashboard & results pages
    /[id]                     # Individual analysis results
  /insights                   # Insights library
  /themes                     # Themes clustering
  /hypotheses                 # Hypotheses management
  /experiments                # Experiments tracking
  /research                   # Research hub (all methods overview)
  /workspaces                 # Workspace management
    /[id]/settings            # Workspace settings
  /settings                   # User settings
  /login                      # Authentication
  /signup                     # Authentication

/components                   # React components (presentational)
  /AppSidebar.tsx             # Main navigation sidebar
  /CSVUploadAnalysis.tsx      # Reusable CSV upload component
  /WorkspaceContext.tsx       # Workspace state management
  /WorkspaceGuard.tsx         # Workspace auth guard
  /AIChat.tsx                 # AI chat interface
  /GA4FunnelChart.tsx         # GA4 funnel visualization
  /ManualInsightModal.tsx     # Manual insight creation
  /shopify                    # Shopify-specific components
    /OrderClustersChart.tsx   # Order value clustering visualization
    /ProductAffinityGrid.tsx  # Product affinity heatmap
    /AOVOpportunitiesList.tsx # Test opportunity recommendations

/lib                          # Core business logic
  /auth                       # Authentication utilities
  /services                   # Business logic services
    /ai                       # AI-related services
      /llm-service.ts         # Universal LLM abstraction
      /claude-insights.ts     # Claude AI service
      /gpt-insights.ts        # GPT AI service
      /prompts                # AI prompts organized by feature
        /csv-analysis-prompts.ts
        /page-analysis-prompts.ts
    /analytics                # Analytics integrations
      /ga4                    # GA4 specific services
        /ga4-client.ts        # GA4 API client
        /ga4-sync.ts          # GA4 data fetching
        /ga4-analysis.ts      # GA4 funnel calculations
        /funnel-insights.ts   # Funnel insight generation
    /shopify                  # Shopify integration services
      /shopify-client.ts      # Shopify API client
      /order-sync.ts          # Order data fetching
      /aov-analysis.ts        # AOV analysis engine
    /data-processing          # Data processing services
      /csv-parser.ts          # CSV parsing & validation
    /external                 # External API clients
      /firecrawl-client.ts    # Firecrawl screenshot service
  /types                      # TypeScript types
    /database.types.ts        # Database schema types (generated)
    /insights.types.ts        # Domain types (hand-written)
  /utils                      # Generic utilities
    /validators.ts            # Input validation

/utils                        # Next.js specific utilities
  /supabase                   # Supabase client utilities
    /client.ts
    /server.ts

/supabase                     # Database migrations & config
  /migrations                 # SQL migrations

/public                       # Static assets
```

---

## Service Layer Architecture

### 1. Service Organization

**Pattern:** One service file per domain concept

```
lib/services/
  ├── ai/                           # AI services
  │   ├── llm-service.ts           # ✅ Universal LLM interface
  │   ├── claude-insights.ts       # ✅ Claude-specific implementation
  │   ├── gpt-insights.ts          # ✅ GPT-specific implementation
  │   └── prompts/                 # Prompts organized by feature
  │       ├── csv-analysis-prompts.ts
  │       └── page-analysis-prompts.ts
  ├── data-processing/             # Data processing services
  │   └── csv-parser.ts            # CSV parsing & validation
  ├── analytics/                   # Analytics integrations
  │   └── ga4/
  │       ├── ga4-client.ts        # GA4 API client
  │       ├── ga4-sync.ts          # Data fetching
  │       ├── ga4-analysis.ts      # Funnel calculations
  │       └── funnel-insights.ts   # Insight generation
  ├── shopify/                     # Shopify integration
  │   ├── shopify-client.ts        # Shopify REST API client
  │   ├── order-sync.ts            # Order data syncing
  │   └── aov-analysis.ts          # AOV analysis engine
  └── external/                    # External API clients
      └── firecrawl-client.ts      # Firecrawl screenshot service
```

### 2. Service Pattern Template

Every service should follow this pattern:

```typescript
/**
 * [Service Name]
 *
 * Purpose: [What this service does]
 * Dependencies: [What it depends on]
 */

// Types at the top
export interface ServiceResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Configuration constants
const CONFIG = {
  timeout: 30000,
  retries: 3,
};

// Main service class or functions
export class MyService {
  // Private helper methods
  private async helper() {}

  // Public interface
  public async execute(): Promise<ServiceResult> {
    try {
      // Implementation
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton export if needed
export const myService = new MyService();
```

### 3. AI Service Pattern

All AI services must use the `llmService` abstraction:

```typescript
import { llmService } from '@/lib/services/ai/llm-service';
import { getPromptForFeature } from '@/lib/services/ai/prompts/feature-prompts';

export async function analyzeWithAI(data: any) {
  const prompt = getPromptForFeature(data);

  const result = await llmService.execute<OutputType>({
    prompt,
    provider: 'claude', // or 'openai'
    maxTokens: 4000,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}
```

**Never:** Call OpenAI or Anthropic APIs directly in business logic

---

## Component Patterns

### 1. Component Organization

```
/components
  ├── [FeatureName]Component.tsx    # Feature components (e.g., CSVUploadAnalysis)
  ├── [LayoutName].tsx              # Layout components (e.g., AppSidebar)
  └── [ContextName]Context.tsx      # Context providers (e.g., WorkspaceContext)
```

### 2. Component Structure

```typescript
'use client'; // Only if needed

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Group imports: React, Next, external, internal

// Types at the top
interface ComponentProps {
  // Props definition
}

interface ComponentState {
  // State shape
}

// Main component
export function ComponentName({ prop }: ComponentProps) {
  // 1. Hooks (in order: context, state, effects, refs)
  const router = useRouter();
  const [state, setState] = useState<ComponentState>();

  useEffect(() => {
    // Effects
  }, []);

  // 2. Event handlers
  const handleAction = async () => {};

  // 3. Computed values
  const computed = useMemo(() => {}, []);

  // 4. Render helpers
  const renderSection = () => {};

  // 5. Main render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### 3. Reusable vs Page-Specific Components

**Reusable Components** → `/components/`
- Used in multiple pages
- Generic, configurable via props
- No workspace-specific logic
- Example: `CSVUploadAnalysis`, `AppSidebar`

**Page-Specific Components** → Keep in the page file or `/app/[page]/_components/`
- Only used in one page
- Page-specific logic
- Example: Progress indicators, page-specific forms

---

## API Route Patterns

### 1. API Route Structure

```
/app/api/
  ├── [feature]/
  │   ├── route.ts              # Main CRUD endpoint
  │   └── [action]/
  │       └── route.ts          # Specific action endpoint
```

### 2. API Route Template

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';
import { myService } from '@/lib/services/my-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Seconds

/**
 * POST /api/feature
 *
 * Description of what this endpoint does
 *
 * Body:
 * {
 *   field: string (description)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await requireAuth();

    // 2. Parse & validate input
    const body = await request.json();
    const { field } = body;

    if (!field) {
      return NextResponse.json(
        { error: 'field is required' },
        { status: 400 }
      );
    }

    // 3. Authorize (check workspace ownership, etc)
    const supabase = createClient();
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 4. Execute business logic (via service)
    const result = await myService.execute({ field });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: result.data,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Rules:**
1. All business logic goes in services (`/lib/services/`)
2. API routes are thin controllers (auth → validate → call service → return)
3. Always return consistent JSON format: `{ success, data?, error? }`

---

## Database & Types

### 1. Type Generation

```bash
# Generate types from Supabase schema
npx supabase gen types typescript --project-id [id] > lib/types/database.types.ts
```

### 2. Domain Types

**Database types** → `/lib/types/database.types.ts` (generated)
**Domain types** → `/lib/types/[domain].types.ts` (hand-written)

Example:
```typescript
// lib/types/insights.types.ts
import { Database } from './database.types';

export type Insight = Database['public']['Tables']['insights']['Row'];

export type ResearchType =
  | 'page_analysis'
  | 'ga_analysis'
  | 'survey_analysis'
  | 'onsite_poll'
  | 'review_mining';

export interface InsightWithRelations extends Insight {
  analysis?: Analysis;
  experiments?: Experiment[];
}
```

### 3. Migration Naming

```
supabase/migrations/
  ├── 001_initial_schema.sql
  ├── 002_add_workspaces.sql
  ├── 003_add_research_types.sql
  └── 999_fix_specific_issue.sql
```

Pattern: `[number]_[descriptive_name].sql`

---

## Naming Conventions

### Files & Folders
- **Components:** PascalCase (`AppSidebar.tsx`, `CSVUploadAnalysis.tsx`)
- **Services:** kebab-case (`llm-service.ts`, `csv-parser.ts`)
- **API Routes:** kebab-case folders (`/analyze-csv/route.ts`)
- **Pages:** kebab-case folders (`/onsite-poll/page.tsx`)
- **Types:** kebab-case (`insights.types.ts`, `database.types.ts`)

### Code
- **Interfaces:** PascalCase with `Interface` suffix for complex types
- **Types:** PascalCase (`ResearchType`, `Insight`)
- **Functions:** camelCase (`analyzeCSV`, `fetchInsights`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_TIMEOUT`)
- **React Components:** PascalCase (`CSVUploadAnalysis`)

### Database
- **Tables:** snake_case, plural (`insights`, `analyses`, `workspaces`)
- **Columns:** snake_case (`created_at`, `user_id`, `research_type`)
- **Enums:** snake_case (`page_analysis`, `survey_analysis`)

---

## Code Organization Rules

### 1. Where Does Code Live?

| Type | Location | Example |
|------|----------|---------|
| Business logic | `/lib/services/` | CSV parsing, AI analysis |
| Database queries | `/lib/services/` or API routes | Fetching insights |
| UI Components | `/components/` | Reusable UI |
| Page components | `/app/[page]/` | Page-specific UI |
| Type definitions | `/lib/types/` | Domain types |
| API endpoints | `/app/api/` | REST endpoints |
| Utilities | `/lib/utils/` | Pure functions |
| Next.js utils | `/utils/` | Supabase clients |

### 2. Import Order

```typescript
// 1. React & Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { createClient } from '@supabase/supabase-js';

// 3. Internal services
import { llmService } from '@/lib/services/ai/llm-service';

// 4. Internal components
import { AppSidebar } from '@/components/AppSidebar';

// 5. Types
import type { Insight } from '@/lib/types/insights.types';

// 6. Styles (if any)
import styles from './styles.module.css';
```

### 3. DRY Principle Checklist

Before writing new code, ask:
- [ ] Does a service for this already exist?
- [ ] Can I use an existing component with different props?
- [ ] Is there a similar API pattern I can follow?
- [ ] Should this be abstracted into a reusable service?

### 4. When to Create a New Service

Create a new service when:
1. ✅ Logic is used in multiple places
2. ✅ Logic is complex (>50 lines)
3. ✅ Logic involves external APIs
4. ✅ Logic has multiple steps with error handling
5. ✅ Logic will be tested separately

Don't create a service for:
1. ❌ Simple one-off calculations
2. ❌ UI state management
3. ❌ Single-use data transformations
4. ❌ Wrapper functions with no logic

---

## Analysis & Insights Pattern (CRITICAL)

> **IMPORTANT**: All research types MUST follow this pattern. This is the core architecture of CRO Copilot.

### The Universal Analysis Flow

Every analysis type (page, GA4, CSV, Shopify, heatmap, etc.) MUST follow this exact flow:

```
1. Fetch/Receive Data
   ↓
2. Create Analysis Record (analyses table)
   ↓
3. Generate Insights via AI (llmService)
   ↓
4. Transform to Standard Format
   ↓
5. Store in insights Table
   ↓
6. Display with Universal UI Components
```

**NO EXCEPTIONS**: Every analysis generates insights that go into the `insights` table.

---

### 1. Analysis Record Creation

**When**: Before or immediately after data processing
**Where**: Service layer (NOT in API route)
**Table**: `analyses`

```typescript
// ✅ CORRECT: Create analysis record
const { data: analysisRecord, error } = await supabase
  .from('analyses')
  .insert({
    user_id: userId,                    // REQUIRED
    workspace_id: workspaceId,          // REQUIRED
    research_type: 'shopify_order_analysis', // REQUIRED (see types below)

    // Flexible fields (use as needed)
    url: inputUrl,                      // Optional: for page analysis
    name: analysisName,                 // Optional: human-readable name
    metrics: { ... },                   // Optional: for page-specific metrics
    context: { ... },                   // Optional: for page-specific context
    input_data: {                       // Optional: flexible input data
      connectionId: '...',
      dateRange: { ... },
      shopDomain: '...',
    },

    // Summary (REQUIRED for all)
    summary: {
      totalOrders: 150,
      averageOrderValue: 83.33,
      period: { start: '...', end: '...' },
    },

    // Status
    status: 'completed',                // 'in_progress' | 'completed' | 'failed'
    error_message: null,
  })
  .select()
  .single();

if (error) throw new Error('Failed to create analysis record');
```

**Research Types** (must match database enum):
- `page_analysis`
- `ga_analysis`
- `survey_analysis`
- `onsite_poll`
- `review_mining`
- `heatmap_analysis`
- `user_testing`
- `competitor_analysis`
- `shopify_order_analysis`

---

### 2. Insights Generation (AI Pattern)

**When**: After analysis record is created
**Where**: Service layer
**How**: Via `llmService.execute()`

```typescript
// ✅ CORRECT: Generate insights with AI
import { llmService } from '@/lib/services/ai/llm-service';
import { getShopifyInsightsPrompt } from '@/lib/services/ai/prompts/shopify-prompts';

export async function generateShopifyInsights(
  workspaceId: string,
  analysisData: any
): Promise<Insight[]> {
  // 1. Build prompt from analysis data
  const prompt = getShopifyInsightsPrompt(analysisData);

  // 2. Call LLM service
  const response = await llmService.execute<Insight[]>({
    prompt,
    provider: 'claude',  // or 'openai'
    maxTokens: 4000,
  });

  if (!response.success) {
    throw new Error(`AI insight generation failed: ${response.error}`);
  }

  // 3. Return insights
  return response.data || [];
}
```

**DO NOT**:
- ❌ Call Anthropic/OpenAI directly
- ❌ Skip AI generation (every analysis needs insights)
- ❌ Generate insights without storing them in `insights` table
- ❌ Store insights only in research-specific tables

---

### 3. Insight Storage Pattern

**Table**: `insights` (unified table for ALL research types)
**When**: After AI generates insights
**Where**: Service layer or API route

```typescript
// ✅ CORRECT: Store insights in unified table
const insightsToStore = aiGeneratedInsights.map((insight) => ({
  // Links
  analysis_id: analysisRecord.id,       // REQUIRED: link to parent analysis
  workspace_id: workspaceId,            // REQUIRED: for RLS

  // Core content
  insight_id: generateInsightId(),      // REQUIRED: unique ID (e.g., "INS-SHOP-123456-abc")
  research_type: 'shopify_order_analysis', // REQUIRED
  source_type: 'automated',             // REQUIRED: 'automated' | 'manual'

  title: insight.title,                 // REQUIRED: short (max 100 chars)
  statement: insight.statement,         // REQUIRED: full insight description

  // Business context
  growth_pillar: insight.growth_pillar, // REQUIRED: 'conversion' | 'aov' | 'frequency' | 'retention' | 'acquisition'
  confidence_level: insight.confidence_level, // REQUIRED: 'high' | 'medium' | 'low'
  priority: insight.priority,           // REQUIRED: 'critical' | 'high' | 'medium' | 'low'

  // Optional context
  customer_segment: insight.customer_segment || null,
  journey_stage: insight.journey_stage || null, // 'awareness' | 'consideration' | 'decision' | 'post_purchase'
  page_location: insight.page_location || null,
  device_type: insight.device_type || null, // 'mobile' | 'desktop' | 'tablet' | 'all'

  // Evidence & categorization
  evidence: insight.evidence || null,   // Quantitative/qualitative data
  friction_type: insight.friction_type || null,
  psychology_principle: insight.psychology_principle || null,
  affected_kpis: insight.affected_kpis || null,
  tags: insight.tags || [],

  // Actions
  suggested_actions: insight.suggested_actions || null,

  // Status
  status: 'draft',                      // 'draft' | 'validated' | 'archived'
  validation_status: 'untested',        // 'untested' | 'testing' | 'validated' | 'invalidated'
}));

const { data: storedInsights, error } = await supabase
  .from('insights')
  .insert(insightsToStore)
  .select();

if (error) throw new Error('Failed to store insights');
```

**Insight ID Format**: `INS-{TYPE}-{TIMESTAMP}-{RANDOM}`
- Example: `INS-SHOP-170123-a4f2e`
- TYPE: 3-4 letter code (SHOP, GA4, SURV, PAGE, etc.)

---

### 4. Dual Table Storage (When Needed)

Some research types store additional metadata in research-specific tables:

```typescript
// ✅ CORRECT: Dual storage pattern
// 1. Store in unified insights table (above)
const { data: storedInsights } = await supabase
  .from('insights')
  .insert(insightsToStore);

// 2. Store research-specific metadata (if needed)
const researchSpecificData = storedInsights.map((insight) => ({
  insight_id: insight.id,
  workspace_id: workspaceId,
  analysis_id: analysisRecord.id,

  // Research-specific fields
  cluster_id: insight.clusterId,        // Shopify: which cluster
  opportunity_type: insight.oppType,    // Shopify: free_shipping, bundle, etc.
  confidence_score: insight.confidenceScore, // Shopify: 1-10 score
  // ... other research-specific fields
}));

await supabase
  .from('shopify_insights_metadata')    // Research-specific table
  .insert(researchSpecificData);
```

**When to use dual storage**:
- ✅ Research type has unique metadata not in standard insight schema
- ✅ Metadata is needed for research-specific queries/filters
- ❌ Don't duplicate standard fields (title, statement, priority, etc.)

---

### 5. AI Prompt Pattern

**Location**: `/lib/services/ai/prompts/{research-type}-prompts.ts`

```typescript
// ✅ CORRECT: Prompt structure
export function getShopifyInsightsPrompt(analysisData: {
  clusters: OrderCluster[];
  productAffinities: ProductAffinity[];
  opportunities: AOVOpportunity[];
  summary: AnalysisSummary;
}): string {
  return `You are an expert CRO analyst specializing in ecommerce optimization. Analyze the following Shopify order data and generate actionable insights.

# Analysis Data

## Order Value Clusters
${JSON.stringify(analysisData.clusters, null, 2)}

## Product Affinities (Market Basket Analysis)
${JSON.stringify(analysisData.productAffinities, null, 2)}

## Identified Opportunities
${JSON.stringify(analysisData.opportunities, null, 2)}

## Summary
${JSON.stringify(analysisData.summary, null, 2)}

---

# Instructions

Analyze this data and identify 5-10 high-impact insights that can drive revenue growth through conversion optimization, AOV increases, or retention improvements.

Focus on:
1. **Patterns in order clusters**: Which segments drive most revenue? Where are opportunities?
2. **Product relationships**: Which products should be bundled or cross-sold?
3. **AOV optimization**: How can we increase average order value?
4. **Customer behavior**: What do purchase patterns reveal about customer segments?

---

# Output Format

Return a JSON array of insights with this EXACT structure:

[
  {
    "title": "Short, actionable insight title (max 100 chars)",
    "statement": "Detailed explanation of the insight with specific data points and reasoning",
    "growth_pillar": "aov | conversion | frequency | retention | acquisition",
    "confidence_level": "high | medium | low",
    "priority": "critical | high | medium | low",
    "customer_segment": "Segment description or null",
    "journey_stage": "awareness | consideration | decision | post_purchase | null",
    "device_type": "mobile | desktop | tablet | all | null",
    "friction_type": "usability | trust | value_perception | information_gap | cognitive_load | null",
    "psychology_principle": "loss_aversion | social_proof | scarcity | authority | anchoring | null",
    "evidence": {
      "quantitative": "Data points supporting this insight",
      "qualitative": "Observable patterns or behaviors"
    },
    "affected_kpis": ["revenue", "aov", "conversion_rate"],
    "suggested_actions": "Specific recommended actions to address this insight",
    "tags": ["#aov", "#bundles", "#pricing"]
  }
]

---

# CRITICAL RULES

1. **MUST return valid JSON array** starting with [ and ending with ]
2. **Quality over quantity**: Generate 5-10 insights ONLY (not 20+)
3. **Use exact enum values**: growth_pillar, friction_type, psychology_principle have fixed options
4. **Use null for uncertain fields**: Don't guess or hallucinate
5. **Evidence must be specific**: Include actual numbers from the data
6. **Focus on high-impact**: Only insights that can significantly move metrics
7. **Be actionable**: Each insight should suggest clear next steps

Generate insights now. Return ONLY the JSON array, no other text.`;
}
```

**Prompt Best Practices**:
- ✅ Include actual data in the prompt
- ✅ Specify exact output format with examples
- ✅ List all valid enum values
- ✅ Emphasize quality over quantity (5-10 insights max)
- ✅ Require specific evidence from data
- ✅ Request actionable recommendations
- ❌ Don't ask for >15 insights (quality degrades)
- ❌ Don't allow freeform field values (use enums)

---

### 6. Service Layer Pattern

**File**: `/lib/services/{domain}/{research-type}-insights.ts`

```typescript
// ✅ CORRECT: Complete service pattern
import { createClient } from '@/utils/supabase/server';
import { llmService } from '@/lib/services/ai/llm-service';
import { getShopifyInsightsPrompt } from '@/lib/services/ai/prompts/shopify-prompts';
import type { Insight } from '@/lib/types/insights.types';

/**
 * Generate insights from Shopify order analysis
 *
 * @param workspaceId - Workspace ID
 * @param analysisData - Results from AOV analysis
 * @returns Array of generated insights
 */
export async function generateShopifyInsights(
  workspaceId: string,
  analysisData: ShopifyAnalysisData
): Promise<Insight[]> {
  const supabase = await createClient();

  try {
    // 1. Create analysis record
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: analysisData.userId,
        workspace_id: workspaceId,
        research_type: 'shopify_order_analysis',
        input_data: {
          connectionId: analysisData.connectionId,
          dateRange: analysisData.dateRange,
        },
        summary: analysisData.summary,
        status: 'completed',
      })
      .select()
      .single();

    if (analysisError) throw new Error(`Failed to create analysis: ${analysisError.message}`);

    // 2. Generate insights with AI
    const prompt = getShopifyInsightsPrompt(analysisData);
    const aiResponse = await llmService.execute<Insight[]>({
      prompt,
      provider: 'claude',
      maxTokens: 8000,
      temperature: 0.7,
    });

    if (!aiResponse.success || !aiResponse.data) {
      throw new Error(`AI generation failed: ${aiResponse.error}`);
    }

    // 3. Transform and store insights
    const insightsToStore = aiResponse.data.map((insight) => ({
      analysis_id: analysisRecord.id,
      workspace_id: workspaceId,
      insight_id: generateInsightId('SHOP'),
      research_type: 'shopify_order_analysis',
      source_type: 'automated',

      title: insight.title,
      statement: insight.statement,
      growth_pillar: insight.growth_pillar,
      confidence_level: insight.confidence_level,
      priority: insight.priority,

      customer_segment: insight.customer_segment || null,
      journey_stage: insight.journey_stage || null,
      device_type: insight.device_type || null,
      friction_type: insight.friction_type || null,
      psychology_principle: insight.psychology_principle || null,

      evidence: insight.evidence || null,
      affected_kpis: insight.affected_kpis || [],
      tags: insight.tags || [],
      suggested_actions: insight.suggested_actions || null,

      status: 'draft',
      validation_status: 'untested',
    }));

    const { data: storedInsights, error: insightError } = await supabase
      .from('insights')
      .insert(insightsToStore)
      .select();

    if (insightError) throw new Error(`Failed to store insights: ${insightError.message}`);

    // 4. Update analysis record with insight count
    await supabase
      .from('analyses')
      .update({ insights_count: storedInsights.length })
      .eq('id', analysisRecord.id);

    return storedInsights as Insight[];

  } catch (error) {
    console.error('Shopify insight generation error:', error);
    throw error;
  }
}

// Helper function
function generateInsightId(type: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 7);
  return `INS-${type}-${timestamp}-${random}`;
}
```

---

### 7. API Route Pattern

**File**: `/app/api/{domain}/analyze/route.ts`

```typescript
// ✅ CORRECT: API route delegates to service
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateShopifyInsights } from '@/lib/services/shopify/shopify-insights';
import { runAOVAnalysis } from '@/lib/services/shopify/aov-analysis';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate input
    const body = await request.json();
    const { workspaceId, connectionId, dateRange } = body;

    if (!workspaceId || !connectionId) {
      return NextResponse.json(
        { error: 'workspaceId and connectionId are required' },
        { status: 400 }
      );
    }

    // 3. Verify workspace access
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 4. Run analysis (statistical calculations)
    const analysisData = await runAOVAnalysis(workspaceId, connectionId, {
      dateRange,
      minConfidence: 0.3,
    });

    // 5. Generate insights (AI)
    const insights = await generateShopifyInsights(workspaceId, {
      ...analysisData,
      userId: user.id,
      connectionId,
      dateRange,
    });

    // 6. Return results
    return NextResponse.json({
      success: true,
      analysisId: insights[0]?.analysis_id,
      insightCount: insights.length,
      insights,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
```

**API Route Rules**:
- ✅ Thin controller (no business logic)
- ✅ Delegate to services
- ✅ Auth, validation, response only
- ❌ No AI calls in routes
- ❌ No complex data processing

---

### 8. UI Display Pattern

**Page**: `/app/analyze/{research-type}/page.tsx`

```typescript
// ✅ CORRECT: Analysis page structure
'use client';

import { useState } from 'react';
import { useWorkspace } from '@/components/WorkspaceContext';

export default function ShopifyAnalysisPage() {
  const { selectedWorkspaceId } = useWorkspace();
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analysisId, setAnalysisId] = useState<string>('');

  const handleAnalyze = async () => {
    setAnalyzing(true);

    try {
      const res = await fetch('/api/shopify/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          connectionId: selectedConnection,
          dateRange: { start, end },
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setInsights(data.insights);
      setAnalysisId(data.analysisId);

    } catch (error) {
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar: Controls */}
      <div className="w-80 border-r border-gray-200 p-6">
        <h2 className="text-xl font-black">Shopify Analysis</h2>

        {/* Connection selector */}
        {/* Date range picker */}

        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full bg-brand-black text-white py-3 rounded-lg"
        >
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Main content: Results */}
      <div className="flex-1 overflow-auto p-8">
        {analyzing && <LoadingSpinner />}

        {insights.length > 0 && (
          <>
            <h1 className="text-3xl font-black mb-6">
              Analysis Results
            </h1>

            {/* Use shared insight display component */}
            <InsightsList insights={insights} />

            {/* Link to full results page */}
            <Link href={`/dashboard/results/${analysisId}`}>
              View Full Analysis →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
```

**Results Detail Page**: `/app/dashboard/results/[id]/page.tsx`
- Universal component that works for ALL research types
- Fetches insights by `analysis_id`
- Expandable cards with priority colors
- Filters by priority, growth pillar, etc.

---

### 9. Complete File Checklist

When adding a new research type, create these files:

```
✅ /lib/services/{domain}/{type}-analysis.ts     # Core analysis logic
✅ /lib/services/{domain}/{type}-insights.ts     # Insight generation
✅ /lib/services/ai/prompts/{type}-prompts.ts    # AI prompts
✅ /app/api/{domain}/analyze/route.ts            # API endpoint
✅ /app/analyze/{type}/page.tsx                  # Analysis UI
✅ /lib/types/{type}.types.ts                    # Type definitions (if needed)
```

**Database**:
```
✅ analyses table: Add research_type to enum
✅ insights table: Automatically works (universal)
✅ {type}_metadata table: Only if research-specific fields needed
```

---

### 10. Analysis Page UI Pattern (MANDATORY)

**ALL analysis pages MUST follow this standard layout pattern.**

#### Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header (Icon + Title + Description)                     │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  Sidebar     │  Main Content                           │
│  (1/3)       │  (2/3)                                   │
│              │                                          │
│  Settings &  │  Recent Analyses List                   │
│  Controls    │  (shows previous analyses)              │
│  (sticky)    │                                          │
│              │  - Clickable cards                      │
│              │  - Shows insights count                 │
│              │  - Shows key metrics                    │
│              │  - Links to results page                │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

#### Required Components

**1. Header Section**
```tsx
<div className="bg-white border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-6 py-6">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 bg-{color}-100 rounded-lg flex items-center justify-center">
        {/* Icon */}
      </div>
      <h1 className="heading-page">{Title}</h1>
    </div>
    <p className="text-body-secondary">{Description}</p>
  </div>
</div>
```

**2. Grid Layout**
```tsx
<main className="max-w-7xl mx-auto px-6 py-6">
  <div className="grid lg:grid-cols-3 gap-8">
    {/* Sidebar (1/3) */}
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
        {/* Settings, controls, action buttons */}
      </div>
    </div>

    {/* Main Content (2/3) */}
    <div className="lg:col-span-2">
      {/* Recent Analyses */}
    </div>
  </div>
</main>
```

**3. Recent Analyses Section (REQUIRED)**

Every analysis page MUST display previous analyses:

```tsx
// State
const [previousAnalyses, setPreviousAnalyses] = useState<any[]>([]);
const [historyLoading, setHistoryLoading] = useState(true);

// Fetch function
const fetchHistory = async () => {
  if (!selectedWorkspaceId) return;

  setHistoryLoading(true);

  const { data } = await supabase
    .from('analyses')
    .select('*')
    .eq('workspace_id', selectedWorkspaceId)
    .eq('research_type', 'your_research_type')
    .order('created_at', { ascending: false })
    .limit(10);

  if (data) {
    // Fetch insights count for each
    const analysesWithCounts = await Promise.all(
      data.map(async (analysis) => {
        const { count } = await supabase
          .from('insights')
          .select('*', { count: 'exact', head: true })
          .eq('analysis_id', analysis.id);

        return { ...analysis, insights_count: count || 0 };
      })
    );

    setPreviousAnalyses(analysesWithCounts);
  }

  setHistoryLoading(false);
};

// Call in useEffect
useEffect(() => {
  if (selectedWorkspaceId) {
    fetchHistory();
  }
}, [selectedWorkspaceId]);

// UI - Recent Analyses
<div className="bg-white rounded-lg shadow-sm border border-gray-200">
  <div className="p-6 border-b border-gray-200">
    <h2 className="text-lg font-black text-brand-black">Recent Analyses</h2>
  </div>

  {historyLoading ? (
    <LoadingSpinner />
  ) : previousAnalyses.length === 0 ? (
    <EmptyState message="No analyses yet" />
  ) : (
    <div className="divide-y divide-gray-200">
      {previousAnalyses.map((analysis) => (
        <Link
          key={analysis.id}
          href={`/dashboard/results/${analysis.id}`}
          className="block p-4 hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Badge, title, metrics */}
              <span className="text-xs font-black px-2 py-1 bg-{color}-100 text-{color}-700 rounded uppercase">
                {TYPE}
              </span>
              <h4 className="font-bold text-brand-black group-hover:text-brand-gold">
                {analysis.name}
              </h4>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>{analysis.insights_count || 0} insights</span>
                {/* Other metrics */}
              </div>
            </div>
            <ChevronRightIcon />
          </div>
        </Link>
      ))}
    </div>
  )}
</div>
```

#### Analysis Flow

**When user clicks "Run Analysis":**

1. Show loading state (optional, can be in sidebar)
2. Run analysis via API
3. **Redirect to results page**: `router.push(/dashboard/results/${analysisId})`
4. Refresh history list before redirect

**DO NOT:**
- ❌ Display insights on the analysis page itself
- ❌ Show full analysis results inline
- ❌ Have separate "view results" buttons

**DO:**
- ✅ Automatically redirect to results page
- ✅ Show previous analyses as clickable cards
- ✅ Include key metrics in the card preview
- ✅ Update history list after analysis completes

#### Example Implementation

See these reference implementations:
- `/app/analyze/shopify-orders/page.tsx` - Shopify analysis (sidebar + history)
- `/components/CSVUploadAnalysis.tsx` - CSV upload component pattern
- `/app/analyze/ga/page.tsx` - GA4 analysis with segments

#### Key Principles

1. **Consistency**: All analysis pages use same layout
2. **Discoverability**: Users can see their previous work
3. **Efficiency**: Quick access to past analyses
4. **Simplicity**: Clear path from analysis → results
5. **Workspace-Scoped**: Always filter by `workspace_id`

---

### 11. Anti-Patterns (DO NOT DO THIS)

❌ **Storing results without insights**:
```typescript
// WRONG: Just storing raw analysis data
await supabase.from('analyses').insert({
  research_type: 'shopify_order_analysis',
  insights: { clusters, opportunities }, // Raw data, no AI insights
});
// MISSING: No insights in insights table!
```

❌ **Skipping AI for "statistical" analysis**:
```typescript
// WRONG: "This is just statistical, no need for AI"
const results = runStatisticalAnalysis(data);
return results; // No insights generated
```

❌ **Calling AI directly in routes**:
```typescript
// WRONG: AI logic in API route
export async function POST(request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({ ... }); // ❌
}
```

❌ **Not following insight schema**:
```typescript
// WRONG: Custom insight structure
await supabase.from('insights').insert({
  my_custom_title: 'Title',
  my_description: 'Description',
  my_score: 8,
  // ❌ Missing required fields: growth_pillar, confidence_level, priority, etc.
});
```

---

## Examples of Proper Architecture

### ✅ Good: CSV Analysis Feature

```
lib/services/data-processing/csv-parser.ts      # Reusable CSV parsing
lib/services/ai/prompts/csv-analysis-prompts.ts # Prompts
app/api/analyze-csv/route.ts                    # API endpoint (thin controller)
components/CSVUploadAnalysis.tsx                # Reusable component
app/analyze/survey/page.tsx                     # Page using component
app/analyze/onsite-poll/page.tsx                # Another page using component
```

**Why it's good:**
- Clear separation: parsing (service) → API (controller) → UI (component)
- Reusable: One component serves 3 pages
- Maintainable: Change CSV parsing logic in one place

### ❌ Bad: Hypothetical Messy Approach

```
app/analyze/survey/csv-parser.ts                # ❌ Logic in page folder
app/analyze/survey/ai-prompt.ts                 # ❌ Prompts scattered
app/analyze/onsite-poll/csv-parser.ts           # ❌ Duplicated code
components/SurveyCSVUpload.tsx                  # ❌ Feature-specific component
components/PollCSVUpload.tsx                    # ❌ Duplicated component
```

**Why it's bad:**
- Duplicated CSV parsing logic
- Scattered prompts
- Feature-specific components instead of generic
- Hard to maintain (change requires updating 3+ files)

---

## Migration Guide for Existing Code

If you find code that doesn't follow this guide:

### 1. Services in Wrong Location
```bash
# Move to proper service folder
mv lib/csv-parser.ts lib/services/data-processing/csv-parser.ts
```

### 2. Business Logic in Components
```typescript
// ❌ Before: Logic in component
function Component() {
  const processData = () => {
    // 100 lines of complex logic
  };
}

// ✅ After: Move to service
// lib/services/data-processor.ts
export function processData() {
  // 100 lines of complex logic
}

// Component
import { processData } from '@/lib/services/data-processor';
function Component() {
  const data = processData();
}
```

### 3. Scattered AI Calls
```typescript
// ❌ Before: Direct API calls everywhere
const response = await anthropic.messages.create({...});

// ✅ After: Use LLM service
const result = await llmService.execute({
  prompt,
  provider: 'claude',
});
```

---

## Review Checklist

Before committing code, verify:

- [ ] Services are in `/lib/services/[domain]/`
- [ ] AI prompts are in `/lib/services/ai/prompts/`
- [ ] Components are reusable (not feature-specific unless justified)
- [ ] API routes are thin (business logic in services)
- [ ] Types are in `/lib/types/`
- [ ] Naming follows conventions
- [ ] No duplicated code
- [ ] Imports are ordered correctly
- [ ] All business logic is testable (in services)

---

## Questions?

When in doubt:
1. Check if similar code exists (search codebase)
2. Follow the pattern of existing code
3. Refer back to this document
4. Ask: "Is this the most senior way to structure this?"

**Keep this document updated as the architecture evolves.**
