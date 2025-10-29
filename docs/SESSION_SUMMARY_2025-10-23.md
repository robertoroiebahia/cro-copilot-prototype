# Session Summary - October 23, 2025

## Tasks Completed

### 1. CSV Analysis Fix - Multiple Insights Issue ✅

**Problem:** CSV analysis was returning only 1 insight instead of 10-20 as expected.

**Solution:**
- Added defensive code in `/app/api/analyze-csv/route.ts` to handle AI response variations:
  - Detects if AI returns single object instead of array → wraps it
  - Detects if AI nests array in wrapper object → extracts it
  - Added detailed logging to debug AI responses

- Strengthened AI prompts in `/lib/services/ai/prompts/csv-analysis-prompts.ts`:
  - Added numbered "CRITICAL INSTRUCTIONS" emphasizing array output
  - Provided 2 complete example insights to show format
  - Removed ambiguous `...` syntax that could confuse AI
  - Emphasized "DO NOT wrap array in parent object"
  - Specific minimum counts: 10-15 for surveys, 8-12 for polls, 12-20 for reviews

**Files Modified:**
- `app/api/analyze-csv/route.ts` - Added array normalization logic
- `lib/services/ai/prompts/csv-analysis-prompts.ts` - Enhanced all 3 prompts

---

### 2. PXL Framework for Hypotheses ✅

**User Request:** Create hypothesis generation system with PXL prioritization framework.

**What is PXL?** Potential × Importance × Ease - A prioritization framework for experiments.

#### 2.1 Database Migration
Created `/supabase/migrations/010_pxl_framework.sql` with:

**PXL Framework Columns (visible in table):**
- `research_backed` (boolean) - Is this backed by research?
- `effort_design` (1-10) - Design effort
- `effort_dev` (1-10) - Development effort
- `effort_copy` (1-10) - Copywriting effort
- `effort_total` (auto-calculated) - Sum of all efforts
- `above_fold` (boolean) - Is element above the fold?
- `psychology_principle` (text) - Psychology principle applied
- `pxl_score` (decimal) - Overall prioritization score

**Detail View Columns (visible when expanded):**
- `page_location` - Where on page (e.g., "Hero section")
- `element_location` - Specific element (e.g., "Above primary CTA")
- `target_url` - Primary target URL
- `target_pages` - Array of page URLs/patterns
- `target_audiences` - Array of audience segments
- `primary_kpi` - Primary success metric
- `secondary_kpis` - Additional metrics to track
- `success_criteria` - JSON with baseline, target, MDE
- `confidence_score` (1-10) - How confident we are
- `potential_value` - "High", "Medium", "Low"
- `ease_score` (1-10) - How easy to implement
- `workspace_id` - Workspace association

**Updates:**
- Migrated from global RLS policies to workspace-based policies
- Added indexes for performance
- Added auto-calculated `effort_total` column

**Status:** ⚠️ Migration file created but NOT yet applied to database

#### 2.2 AI Prompt for Hypothesis Generation
Created `/lib/services/ai/prompts/hypothesis-generation-prompts.ts`:

**Features:**
- Generates 5-10 testable hypotheses from themes and insights
- Follows "If [change], then [outcome] because [reasoning]" format
- Evaluates all PXL framework dimensions
- Provides 2 complete examples showing correct format
- Emphasizes JSON array output (learned from CSV fix)
- Includes realistic effort estimation guidance
- Sets appropriate priority levels (P0/P1/P2)

**Input:** Themes + Insights + Optional business context
**Output:** Array of 5-10 hypothesis objects with all PXL fields populated

#### 2.3 API Endpoint
Created `/app/api/hypotheses/generate/route.ts`:

**Endpoint:** `POST /api/hypotheses/generate`

**Body:**
```json
{
  "workspaceId": "uuid",
  "themeIds": ["THM-001", "THM-002"], // optional - specific themes
  "context": { // optional
    "industry": "E-commerce",
    "targetAudience": "B2C consumers",
    "currentConversionRate": "2.3%"
  }
}
```

**Flow:**
1. Fetches themes (specific IDs or top 10 by priority)
2. Fetches related insights (from themes + recent workspace insights)
3. Generates hypotheses using AI with PXL framework
4. Calculates PXL score: `(Potential × Confidence × Ease) / 1000 × 100`
5. Stores hypotheses in database
6. Returns created hypotheses

**Features:**
- Defensive AI response handling (same as CSV fix)
- Automatic PXL score calculation
- Workspace verification
- Detailed logging

#### 2.4 TypeScript Types Update
Updated `/lib/types/insights.types.ts`:

Extended `Hypothesis` interface with all PXL framework fields.

#### 2.5 Hypotheses Page Update
Modified `/app/hypotheses/page.tsx`:

**Added:**
- "Generate Hypotheses from Themes" button
- `handleGenerateHypotheses()` function that calls the new API
- Loading state during generation
- Error handling with user feedback

**Existing Features (kept):**
- PXL table view with research-backed, effort scores, above fold, psychology
- Click to expand detail view
- Filtering by status and priority
- Search functionality
- Status management (draft → approved → testing → validated/invalidated)

---

## Files Created

1. `/supabase/migrations/010_pxl_framework.sql` - Database migration
2. `/lib/services/ai/prompts/hypothesis-generation-prompts.ts` - AI prompt
3. `/app/api/hypotheses/generate/route.ts` - API endpoint
4. `/docs/SESSION_SUMMARY_2025-10-23.md` - This file

## Files Modified

1. `/app/api/analyze-csv/route.ts` - CSV insight fix
2. `/lib/services/ai/prompts/csv-analysis-prompts.ts` - Stronger prompts
3. `/lib/types/insights.types.ts` - Added PXL fields to Hypothesis interface
4. `/app/hypotheses/page.tsx` - Added generation button

---

## What's Left to Do

### Critical - Before Testing
1. **Apply database migration:**
   ```bash
   # Connect to Supabase and run:
   psql ... -f supabase/migrations/010_pxl_framework.sql
   ```
   OR use Supabase CLI:
   ```bash
   supabase db push
   ```

### Testing
2. **Test CSV analysis fix** - Upload a CSV and verify you get 10-20 insights (not just 1)
3. **Test hypothesis generation** - Navigate to /hypotheses and click "Generate Hypotheses from Themes"

### Optional Enhancements
4. **Manual hypothesis creation form** - Currently can only auto-generate, might want manual entry
5. **PXL table view** - The existing page uses cards; user mentioned wanting a table with PXL columns visible
6. **Theme page integration** - User mentioned wanting generation button on themes page too

---

## Key Design Decisions

### Why Workspace-Based RLS?
Changed hypotheses from global (all authenticated users) to workspace-scoped for:
- Multi-tenancy support
- Data isolation
- Proper access control

### Why Defensive AI Response Handling?
Added array normalization because LLMs can return:
- Single object instead of array
- Array nested in wrapper object (`{insights: [...]}`)
- Different formats despite clear instructions

This ensures robustness regardless of AI quirks.

### Why Auto-Calculate PXL Score?
Formula: `(Potential Value Score × Confidence Score × Ease Score) / 1000 × 100`

Where:
- Potential Value: High=10, Medium=6, Low=3
- Confidence Score: 1-10 from AI
- Ease Score: 1-10 from AI
- Result: Normalized to 0-100 scale

This makes prioritization objective and sortable.

---

## Next Session Priorities

1. Apply the database migration (`010_pxl_framework.sql`)
2. Test CSV analysis with sample data
3. Test hypothesis generation
4. (Optional) Build PXL table view for hypotheses page
5. (Optional) Add generation button to themes page

---

## TypeScript Build Status

✅ **All builds passing** - No TypeScript errors after all changes.
