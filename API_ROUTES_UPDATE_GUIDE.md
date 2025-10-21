# 🔧 API Routes Update Guide

**Status:** Use after migration 011 completes
**Priority:** Critical - App won't work without this
**Estimated Time:** 1-2 hours

---

## Overview

After the database migration adds `workspace_id` columns, you need to update all API routes to:

1. Accept `workspaceId` from frontend
2. Validate workspace belongs to user
3. Save data with `workspace_id`
4. Query data using `workspace_id`

---

## 🎯 Critical Routes to Update

### Priority 1 (Breaks immediately without update):
1. ✅ `/app/api/analyze-v2/route.ts` - Page analysis
2. ✅ `/app/api/insights/[id]/route.ts` - Update/delete insights
3. ✅ `/app/api/hypotheses/route.ts` - Create hypotheses

### Priority 2 (New features):
4. `/app/api/themes/route.ts` - Theme operations
5. `/app/api/experiments/route.ts` - Experiment operations

---

## 📝 Pattern: Workspace Validation Helper

First, create a reusable validation function:

```typescript
// File: /lib/utils/workspace-validation.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function validateWorkspaceAccess(
  workspaceId: string,
  userId: string
): Promise<{ valid: boolean; error?: NextResponse }> {
  const supabase = createClient();

  // Check if workspace exists and belongs to user
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id, user_id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !workspace) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: 'Invalid workspace or access denied',
          code: 'WORKSPACE_ACCESS_DENIED',
        },
        { status: 403 }
      ),
    };
  }

  return { valid: true };
}
```

---

## 🔥 Example 1: Update /app/api/analyze-v2/route.ts

This is the **MOST CRITICAL** route to update.

### Current Code (BROKEN):

```typescript
export async function POST(request: NextRequest) {
  // ... auth code ...

  const body = await request.json();
  const { url, options = {} } = body;
  const userId = user.id;

  // ❌ PROBLEM: No workspaceId validation

  // ... scraping code ...

  // ❌ PROBLEM: Saves without workspace_id
  const { data: savedAnalysis } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,  // ❌ Still using old user_id only
      url,
      // ...
    });
}
```

### Updated Code (FIXED):

```typescript
import { validateWorkspaceAccess } from '@/lib/utils/workspace-validation';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ✅ 1. Authenticate user (existing code)
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ 2. Rate limit check (existing code)
    const rateLimitResult = await rateLimit(user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', ...rateLimitResult },
        { status: 429 }
      );
    }

    // ✅ 3. Parse request body - NOW includes workspaceId
    const body = await request.json();
    const { url, workspaceId, options = {} } = body;
    const userId = user.id;

    // ✅ 4. Validate input
    if (!url) {
      throw new ValidationError('URL is required', { url });
    }

    // ✅ 5. NEW: Validate workspaceId
    if (!workspaceId) {
      return NextResponse.json(
        {
          error: 'Workspace ID is required',
          code: 'WORKSPACE_REQUIRED',
        },
        { status: 400 }
      );
    }

    // ✅ 6. NEW: Verify workspace belongs to user
    const validation = await validateWorkspaceAccess(workspaceId, userId);
    if (!validation.valid) {
      return validation.error!;
    }

    logger.info('Starting analysis v2', { url, userId, workspaceId });

    // Generate analysis ID
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Step 1: Scrape the page (existing code - no changes needed)
    const firecrawl = createFirecrawlService();
    const scrapeResult = await firecrawl.scrape(url, {
      formats: ['markdown', 'html', 'screenshot'],
      onlyMainContent: true,
    });

    if (!scrapeResult.success || !scrapeResult.markdown) {
      throw new Error('Failed to scrape page');
    }

    // Step 2: Analyze page (existing code - no changes needed)
    const analyzer = createPageAnalyzer(options.llmProvider || 'gpt');
    const analysisResult = await analyzer.execute({
      analysisId,
      userId,
      url,
      content: {
        url,
        markdown: scrapeResult.markdown,
        html: scrapeResult.html,
        screenshot: scrapeResult.screenshot,
        metadata: scrapeResult.metadata,
      },
    });

    if (!analysisResult.success || !analysisResult.data) {
      throw new Error('Analysis failed: ' + analysisResult.error?.message);
    }

    const insights = analysisResult.data.insights;

    // ✅ 7. UPDATED: Save analysis WITH workspace_id
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        workspace_id: workspaceId, // ✅ NEW: Add workspace_id
        url,
        research_type: 'page_analysis',
        metrics: {},
        context: {
          llm_provider: options.llmProvider || 'gpt',
          temp_analysis_id: analysisId,
          has_screenshot: !!scrapeResult.screenshot,
        },
        summary: analysisResult.data.summary || {},
        screenshots: scrapeResult.screenshot ? {
          full_page: scrapeResult.screenshot,
          captured_at: new Date().toISOString(),
        } : null,
        usage: {
          scraped_at: new Date().toISOString(),
          scrape_metadata: scrapeResult.metadata,
        },
        status: 'completed',
      })
      .select()
      .single();

    if (saveError) {
      logger.error('Failed to save analysis', saveError);
      // ❌ IMPROVEMENT: Actually fail the request instead of silent failure
      throw new Error('Failed to save analysis to database');
    }

    const dbAnalysisId = savedAnalysis?.id || null;
    logger.info('Analysis saved to database', { dbAnalysisId, workspaceId });

    // ✅ 8. UPDATED: Save insights WITH workspace_id
    if (dbAnalysisId && insights.length > 0) {
      const insightsToSave = insights.map((insight) => ({
        analysis_id: dbAnalysisId,
        workspace_id: workspaceId, // ✅ NEW: Add workspace_id
        user_id: userId, // Keep for backward compatibility
        insight_id: `INS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
        research_type: 'page_analysis',
        source_type: 'automated',
        source_url: url,
        title: insight.title,
        statement: insight.description,
        category: insight.category,
        severity: insight.severity,
        confidence: insight.confidence,
        evidence: insight.evidence,
        recommendations: insight.recommendations,
        // ... rest of insight fields ...
      }));

      const { error: insightsError } = await supabase
        .from('insights')
        .insert(insightsToSave);

      if (insightsError) {
        logger.error('Failed to save insights', insightsError);
        // Don't fail the whole request, but log it
      }
    }

    // Return response (existing code)
    return NextResponse.json({
      success: true,
      analysisId: dbAnalysisId,
      workspaceId, // ✅ Include in response
      insights: insights.length,
      // ... rest of response ...
    });

  } catch (error) {
    // Error handling (existing code)
    return ErrorHandler.handle(error);
  }
}
```

### Key Changes:

1. ✅ Accept `workspaceId` from request body
2. ✅ Validate `workspaceId` is provided
3. ✅ Verify workspace belongs to user
4. ✅ Include `workspace_id` when saving analysis
5. ✅ Include `workspace_id` when saving insights
6. ✅ Return `workspaceId` in response

---

## 🔥 Example 2: Update GET Endpoints

For routes that fetch data (like listing analyses):

```typescript
// Before (user_id based)
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', user.id); // ❌ Old way
}

// After (workspace_id based)
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get workspaceId from query params
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'Workspace ID required' },
      { status: 400 }
    );
  }

  // Validate workspace access
  const validation = await validateWorkspaceAccess(workspaceId, user.id);
  if (!validation.valid) {
    return validation.error!;
  }

  // Query with workspace_id
  const { data } = await supabase
    .from('analyses')
    .select('*')
    .eq('workspace_id', workspaceId); // ✅ New way

  return NextResponse.json({ data });
}
```

---

## 🔥 Example 3: Update DELETE/PATCH Endpoints

For update/delete operations:

```typescript
// PATCH /api/insights/[id]/route.ts

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { workspaceId, ...updates } = body;

  // ✅ Validate workspace
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'Workspace ID required' },
      { status: 400 }
    );
  }

  const validation = await validateWorkspaceAccess(workspaceId, user.id);
  if (!validation.valid) {
    return validation.error!;
  }

  // ✅ Update - RLS will enforce workspace access automatically
  // But we verify the insight belongs to this workspace for safety
  const { data, error } = await supabase
    .from('insights')
    .update(updates)
    .eq('id', params.id)
    .eq('workspace_id', workspaceId) // ✅ Double-check workspace
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
```

---

## 📋 Checklist: All Routes to Update

### Analyze Routes
- [ ] `/app/api/analyze-v2/route.ts` - POST (create analysis)
- [ ] `/app/api/analyze/route.ts` - GET (list analyses)

### Insight Routes
- [ ] `/app/api/insights/route.ts` - GET, POST
- [ ] `/app/api/insights/[id]/route.ts` - PATCH, DELETE

### Theme Routes
- [ ] `/app/api/themes/route.ts` - GET, POST
- [ ] `/app/api/themes/[id]/route.ts` - PATCH, DELETE

### Hypothesis Routes
- [ ] `/app/api/hypotheses/route.ts` - GET, POST
- [ ] `/app/api/hypotheses/[id]/route.ts` - PATCH, DELETE

### Experiment Routes
- [ ] `/app/api/experiments/route.ts` - GET, POST
- [ ] `/app/api/experiments/[id]/route.ts` - PATCH, DELETE

---

## 🧪 Testing After Updates

Test each updated route:

```bash
# 1. Test creating analysis with workspace
curl -X POST http://localhost:3000/api/analyze-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "workspaceId": "your-workspace-uuid"
  }'

# Expected: Success with analysisId and workspaceId in response

# 2. Test without workspaceId (should fail)
curl -X POST http://localhost:3000/api/analyze-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'

# Expected: 400 error "Workspace ID is required"

# 3. Test with invalid workspaceId (should fail)
curl -X POST http://localhost:3000/api/analyze-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "workspaceId": "fake-uuid"
  }'

# Expected: 403 error "Invalid workspace or access denied"
```

---

## ⚡ Quick Reference: Required Changes

Every API route that creates/updates/deletes data needs:

```typescript
// 1. Accept workspaceId
const { workspaceId, ...otherData } = await request.json();

// 2. Validate it
if (!workspaceId) {
  return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
}

const validation = await validateWorkspaceAccess(workspaceId, user.id);
if (!validation.valid) {
  return validation.error!;
}

// 3. Use it in queries
.eq('workspace_id', workspaceId)

// 4. Include it in inserts
.insert({ workspace_id: workspaceId, ...otherData })
```

---

## 🐛 Common Mistakes

### ❌ Mistake 1: Trusting frontend workspaceId without validation

```typescript
// DANGEROUS - User could send any workspace UUID
const { workspaceId } = await request.json();
await supabase.from('analyses').insert({ workspace_id: workspaceId });
```

### ✅ Fix: Always validate workspace belongs to user

```typescript
const validation = await validateWorkspaceAccess(workspaceId, user.id);
if (!validation.valid) return validation.error!;
```

### ❌ Mistake 2: Forgetting workspace_id in child records

```typescript
// Create analysis ✅
await supabase.from('analyses').insert({ workspace_id });

// Create insights ❌ - Missing workspace_id!
await supabase.from('insights').insert({ analysis_id });
```

### ✅ Fix: Include workspace_id in ALL inserts

```typescript
await supabase.from('insights').insert({
  analysis_id,
  workspace_id, // ✅ Always include
});
```

---

## 📊 Verification Queries

After updating all routes, verify data integrity:

```sql
-- 1. Check no new records are missing workspace_id
SELECT 'analyses' as table_name, COUNT(*) as missing
FROM analyses WHERE workspace_id IS NULL
UNION ALL
SELECT 'insights', COUNT(*) FROM insights WHERE workspace_id IS NULL;

-- Expected: 0 missing for all tables

-- 2. Check all workspace_ids are valid
SELECT 'analyses' as table_name, COUNT(*) as invalid
FROM analyses a
WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = a.workspace_id)
UNION ALL
SELECT 'insights', COUNT(*)
FROM insights i
WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = i.workspace_id);

-- Expected: 0 invalid for all tables
```

---

## 🎯 Next Steps

After updating all API routes:

1. **Test thoroughly** - Every create/update/delete operation
2. **Monitor errors** - Check for workspace validation failures
3. **Update frontend** - Make sure all API calls send workspaceId
4. **Review logs** - Watch for workspace access denied errors (might indicate bugs)
5. **Performance test** - Check if workspace validation adds latency

---

## 🆘 Troubleshooting

### Issue: "Workspace ID required" errors everywhere

**Cause:** Frontend not sending workspaceId

**Fix:** Update frontend API calls:
```typescript
// Before
await fetch('/api/analyze-v2', {
  body: JSON.stringify({ url })
});

// After
await fetch('/api/analyze-v2', {
  body: JSON.stringify({
    url,
    workspaceId: selectedWorkspaceId // ✅ Add this
  })
});
```

### Issue: "Invalid workspace or access denied"

**Cause:** User trying to access workspace they don't own, or workspace doesn't exist

**Fix:** Check workspace exists and belongs to user:
```sql
SELECT * FROM workspaces WHERE id = 'the-workspace-id';
```

### Issue: RLS policy blocking legitimate access

**Cause:** RLS policies may be too restrictive or not updated

**Fix:** Verify RLS policies were updated in migration:
```sql
SELECT policyname, qual FROM pg_policies
WHERE tablename = 'analyses';
```

---

Ready to update your API routes? Start with `/app/api/analyze-v2/route.ts` - it's the most critical one!
