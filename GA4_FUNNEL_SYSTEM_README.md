# GA4 Funnel Analysis System

A complete funnel analysis system that pulls GA4 event data, calculates conversion rates by segment, and generates AI-powered insights about drop-off points.

**Multi-Workspace Architecture**: One account can manage multiple workspaces (clients/properties), each with their own GA4 configuration and data.

## System Overview

The system consists of 5 main components:

1. **Data Sync** - Pulls raw events from GA4 API
2. **Storage** - Saves events with all dimensions (workspace-scoped)
3. **Calculation** - Builds funnels by segment with conversion rates
4. **Storage** - Saves pre-calculated funnels for fast loading
5. **AI Analysis** - Generates insights (observations only, no recommendations)

## The Funnel (5 Steps)

1. Landing (session_start)
2. Product View (view_item)
3. Add to Cart (add_to_cart)
4. Checkout (begin_checkout)
5. Purchase (purchase)

## What We Track

### Events from GA4
- session_start
- view_item
- add_to_cart
- begin_checkout
- purchase

### Dimensions
- Device Category (mobile, desktop, tablet)
- Channel (direct, email, organic, paid, social)
- User Type (new, returning)
- Country (US, non-US)
- Landing Page (homepage, product, collection, blog, other)

### Metrics Per Event
- event_count
- total_users
- sessions

## Segments (18 Total)

- All Users
- Device: Mobile, Desktop, Tablet
- Channel: Direct, Email, Organic, Paid, Social
- User Type: New, Returning
- Country: US, International
- Landing Page: Homepage, Product, Collection, Blog

## Database Schema

### Tables Created

1. **workspaces** - Workspace (client/property) management
   - Each workspace has its own GA4 configuration
   - Users can own multiple workspaces
   - All data tables are scoped by `workspace_id`

2. **ga4_raw_events** - Raw event data from GA4 (workspace-scoped)
3. **ga4_calculated_funnels** - Pre-calculated funnels by segment (workspace-scoped)
4. **ga4_funnel_insights** - AI-generated insights (workspace-scoped)

### Workspace Table

New `workspaces` table with:
- `id` - Workspace UUID
- `user_id` - Owner reference
- `name` - Workspace name
- `description` - Optional description
- `website_url` - Website URL
- `ga4_property_id` - GA4 Property ID (per workspace)
- `ga4_refresh_token` - Encrypted OAuth refresh token (per workspace)
- `ga4_last_sync_at` - Last sync timestamp
- `ga4_sync_enabled` - Whether auto-sync is enabled
- `timezone` - Workspace timezone
- `currency` - Workspace currency
- `is_active` - Soft delete flag

## File Structure

### Services

```
lib/services/ga4/
├── ga4-sync.ts              # Syncs data from GA4 API
├── funnel-calculator.ts     # Calculates funnels from raw events
└── funnel-insights.ts       # AI insight generation
```

### API Routes

```
app/api/ga4/
├── sync/route.ts           # POST - Sync GA4 data
├── funnels/route.ts        # GET - Get calculated funnels
├── insights/route.ts       # GET/POST - Get/generate insights
└── settings/route.ts       # GET/POST - GA4 configuration
```

### UI Components

```
app/funnel/page.tsx              # Main funnel dashboard
components/
├── GA4FunnelChart.tsx           # Funnel visualization
├── SegmentComparison.tsx        # Segment comparison table
└── FunnelInsightsList.tsx       # AI insights display
```

### Database

```
supabase/migrations/
├── 010_ga4_funnel_system.sql              # GA4 funnel schema
└── 011_multi_workspace_architecture.sql   # Multi-workspace refactor
```

## Setup & Installation

### 1. Run Database Migration

```bash
# Copy SQL to Supabase SQL Editor and run
cat supabase/migrations/010_ga4_funnel_system.sql
```

Or use Supabase dashboard:
1. Go to SQL Editor
2. Paste migration contents
3. Click "Run"

### 2. Create Workspaces

Users need to:
1. Sign in with Google OAuth (to get Analytics access)
2. Create a workspace at `/workspaces`
3. Get their GA4 Property ID from Google Analytics
4. Configure GA4 for the workspace in Settings

### 3. Initial Sync

```bash
# Via API (requires workspaceId)
POST /api/ga4/sync
{
  "workspaceId": "workspace-uuid",
  "type": "initial",
  "generateInsights": true
}
```

This will:
- Sync last 90 days of data for the workspace
- Calculate funnels for all segments
- Generate AI insights

## Usage

### Sync Data

All API calls now require `workspaceId`:

```typescript
// Initial sync (90 days)
await fetch('/api/ga4/sync', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId: 'workspace-uuid',
    type: 'initial'
  })
});

// Daily sync (yesterday only)
await fetch('/api/ga4/sync', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId: 'workspace-uuid',
    type: 'daily'
  })
});

// Custom date range
await fetch('/api/ga4/sync', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId: 'workspace-uuid',
    type: 'custom',
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  })
});
```

### Get Funnel Data

```typescript
// Get all funnels for a date range
const res = await fetch(
  '/api/ga4/funnels?workspaceId=workspace-uuid&startDate=2025-01-01&endDate=2025-01-31'
);
const { funnels } = await res.json();

// Get specific segment
const res = await fetch(
  '/api/ga4/funnels?workspaceId=workspace-uuid&startDate=2025-01-01&endDate=2025-01-31&segment=device_mobile'
);
const { funnel } = await res.json();
```

### Get Insights

```typescript
// Get all recent insights
const res = await fetch('/api/ga4/insights?workspaceId=workspace-uuid&limit=20');
const { insights } = await res.json();

// Get critical insights only
const res = await fetch('/api/ga4/insights?workspaceId=workspace-uuid&critical=true');
const { insights } = await res.json();

// Get by type
const res = await fetch('/api/ga4/insights?workspaceId=workspace-uuid&type=drop_off');
const { insights } = await res.json();
```

### Generate New Insights

```typescript
await fetch('/api/ga4/insights', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId: 'workspace-uuid',
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  })
});
```

## Funnel Calculation Logic

For each segment:

1. **Filter events** by segment criteria
2. **Sum users** for each event
3. **Calculate conversion rate**: `(step users / landing users) × 100`
4. **Calculate drop-off**: `previous step users - current step users`
5. **Calculate drop-off rate**: `(drop-off / previous step users) × 100`
6. **Overall CVR**: `(purchases / landing users) × 100`

Result stored as JSON in `funnel_data` column.

## AI Insight Generation

### What AI Does

✅ Observes patterns in the data
✅ Flags anomalies
✅ Compares segments
✅ Identifies gaps

### What AI Does NOT Do

❌ Generate hypotheses
❌ Recommend tests
❌ Suggest solutions
❌ Make predictions

### Insight Types

1. **Gap Analysis** - Actual vs target performance
2. **Segment Comparison** - Mobile vs desktop, new vs returning
3. **Drop-off** - Biggest funnel leaks
4. **Anomaly** - Unusual patterns
5. **Temporal Pattern** - Time-based changes

### Insight Format

```json
{
  "insight_type": "segment_comparison",
  "observation": "Mobile users have 16.7% higher drop-off at Add to Cart",
  "data_points": {
    "segment": "Mobile",
    "drop_off_rate": 45.2,
    "comparison_segment": "Desktop",
    "comparison_drop_off_rate": 28.5,
    "difference": 16.7
  },
  "impact": "critical",
  "confidence": "high",
  "primary_segment": "Mobile",
  "comparison_segment": "Desktop"
}
```

## Sync Strategy

### Frequency

- **Daily**: Pull yesterday's data at 2am
- **On-demand**: User can trigger manual sync
- **Weekly**: AI generates new insights every Monday

### Date Ranges Calculated

- Last 7 days (rolling)
- Last 30 days (rolling)
- Last 90 days (rolling)

### Performance

- Sync: ~2-5 minutes per workspace
- Calculation: ~10-30 seconds for all segments
- Page load: <2 seconds (uses pre-calculated funnels)

## Dashboard UI

### Features

✅ Funnel visualization (5 steps with conversion rates)
✅ Segment comparison table
✅ AI-generated insights list
✅ Date range selector (7/30/90 days)
✅ Segment filter dropdown
✅ Manual sync button
✅ Color-coded drop-off severity

### Access

Navigate to `/funnel` to view the dashboard.

## API Endpoints Summary

### Workspace Management

#### GET /api/workspaces
Get all workspaces for current user

#### POST /api/workspaces
Create new workspace

**Body:**
```json
{
  "name": "My Company",
  "description": "Optional",
  "websiteUrl": "https://example.com",
  "timezone": "UTC",
  "currency": "USD"
}
```

#### GET /api/workspaces/[id]
Get single workspace

#### PUT /api/workspaces/[id]
Update workspace

#### DELETE /api/workspaces/[id]
Delete workspace (soft delete)

### GA4 Operations

#### POST /api/ga4/sync
Sync GA4 data and calculate funnels

**Body:**
```json
{
  "workspaceId": "workspace-uuid",
  "type": "initial" | "daily" | "custom",
  "startDate": "YYYY-MM-DD",  // For custom
  "endDate": "YYYY-MM-DD",    // For custom
  "generateInsights": boolean
}
```

#### GET /api/ga4/funnels
Get calculated funnels

**Query:**
- `workspaceId` (required)
- `startDate` (required)
- `endDate` (required)
- `segment` (optional)

#### GET /api/ga4/insights
Get funnel insights

**Query:**
- `workspaceId` (required)
- `type` (optional): gap_analysis, segment_comparison, drop_off, anomaly
- `critical` (optional): true/false
- `limit` (optional): number

#### POST /api/ga4/insights
Generate new insights

**Body:**
```json
{
  "workspaceId": "workspace-uuid",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

#### GET /api/ga4/settings
Get workspace GA4 settings

**Query:**
- `workspaceId` (required)

#### POST /api/ga4/settings
Update workspace GA4 settings

**Body:**
```json
{
  "workspaceId": "workspace-uuid",
  "propertyId": "123456789",
  "refreshToken": "encrypted_token",
  "syncEnabled": true
}
```

## Next Steps (Not Implemented)

### High Priority

1. **GA4 Settings Page** (`/settings/ga4`)
   - Configure property ID
   - Test connection
   - Enable/disable auto-sync

2. **Daily Cron Job**
   - Vercel cron or background job
   - Runs daily at 2am
   - Syncs all enabled workspaces

3. **Weekly Insight Generation**
   - Runs every Monday
   - Generates fresh insights
   - Clears old insights

### Medium Priority

4. **Token Encryption**
   - Encrypt `ga4_refresh_token` before storing
   - Decrypt when using

5. **Error Handling UI**
   - Show sync errors to users
   - Retry failed syncs

6. **Export Functionality**
   - Export funnel data to CSV
   - Export insights to PDF

### Low Priority

7. **Custom Segments**
   - Allow users to define custom segments
   - Save segment configurations

8. **Alerts**
   - Email when CVR drops significantly
   - Notify on critical insights

## Success Criteria

✅ Funnels match GA4 data (same conversion rates)
✅ Can view funnel by any segment
✅ AI generates 5-10 insights per analysis
✅ Page loads in <2 seconds
✅ Daily sync completes in <5 minutes

## Troubleshooting

### No Data Showing

1. Check GA4 is configured in profile
2. Run initial sync
3. Verify events exist in GA4

### Sync Failing

1. Check OAuth token is valid
2. Verify GA4 property ID is correct
3. Check GA4 API quota

### Insights Not Generating

1. Ensure funnels are calculated
2. Check Anthropic API key is set
3. Verify sufficient data exists

## Security Notes

⚠️ **Important:**
- GA4 refresh tokens should be encrypted at rest
- Use environment variables for API keys
- RLS policies protect user data
- Never expose tokens to client

## Performance Optimization

- Raw events indexed by user_id, date, event_name
- Funnels pre-calculated and cached
- Composite indexes on common queries
- JSONB for flexible funnel data storage

## Dependencies

- `googleapis` - GA4 API access
- `@anthropic-ai/sdk` - AI insight generation
- Supabase - Database and RLS
- Next.js 14 - Framework

## Support

For issues or questions:
1. Check this README
2. Review API error messages
3. Check Supabase logs
4. Verify GA4 connection

---

Built with ❤️ for data-driven CRO
