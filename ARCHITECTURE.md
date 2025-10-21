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
