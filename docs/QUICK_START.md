# Quick Start Guide

## What Was Built

An evidence-based CRO insights platform with:
- **Atomic Insights** → **Themes** → **Hypotheses** → **Experiments**

## File Structure

```
lib/
├── types/           # TypeScript types
├── utils/           # Logger, cache, errors
├── modules/         # Module system
├── services/        # Integrations + AI
├── analyzers/       # Insight/theme extraction
app/api/
├── analyze/         # Original API (working)
└── analyze-v2/      # New modular API
supabase/migrations/
└── 004_insights_system.sql
```

## Next Actions

1. **Push Migration**: `supabase db push`
2. **Test API**: POST to `/api/analyze-v2`
3. **Build UI**: Create InsightCard component
4. **Test**: Run with real URLs

## Key Files

- Database: `supabase/migrations/004_insights_system.sql`
- Types: `lib/types/database-insights.types.ts`
- AI: `lib/services/ai/gpt-insights.ts`
- Analyzer: `lib/analyzers/insight-extractor-v2.ts`
