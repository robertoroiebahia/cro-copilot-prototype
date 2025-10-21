# Google Analytics Integration Guide

Your OAuth setup now includes Google Analytics API access! Here's how to use it.

## What's Included

✅ **Google Analytics scope** - OAuth requests `analytics.readonly` permission
✅ **GA4 support** - Works with Google Analytics 4 properties
✅ **Universal Analytics** - Also supports legacy GA (if still active)
✅ **Automatic token management** - Supabase handles refresh tokens
✅ **Server-side API** - Secure access to GA data from your backend

## How It Works

1. User signs in with Google OAuth
2. Google asks permission for Analytics access
3. Supabase stores the access token and refresh token
4. Your server can use these tokens to call Google Analytics API

## Files Created

### Service Layer
- `lib/services/google-analytics.ts` - Helper functions for GA API

### API Routes
- `app/api/google-analytics/properties/route.ts` - Get GA4 properties
- `app/api/google-analytics/report/route.ts` - Run custom GA4 reports

## Usage Examples

### 1. Get User's GA4 Properties

```typescript
// In a Server Component
import { getGA4Properties } from '@/lib/services/google-analytics';

export default async function AnalyticsPage() {
  const properties = await getGA4Properties();

  return (
    <div>
      <h1>Your GA4 Properties</h1>
      {properties.map(prop => (
        <div key={prop.name}>
          {prop.displayName} - {prop.name}
        </div>
      ))}
    </div>
  );
}
```

### 2. From Client Component (via API)

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function MyComponent() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    fetch('/api/google-analytics/properties')
      .then(res => res.json())
      .then(data => setProperties(data.properties));
  }, []);

  return (
    <div>
      {properties.map(prop => (
        <div key={prop.name}>{prop.displayName}</div>
      ))}
    </div>
  );
}
```

### 3. Get Pageviews

```typescript
import { getPageviews } from '@/lib/services/google-analytics';

const data = await getPageviews(
  '123456789',  // GA4 Property ID
  '2025-01-01',
  '2025-01-31'
);

console.log(data.rows); // Array of pageview data by date
```

### 4. Run Custom Report

```typescript
import { runGA4Report } from '@/lib/services/google-analytics';

const report = await runGA4Report(
  '123456789',  // Property ID
  { startDate: '2025-01-01', endDate: '2025-01-31' },
  ['screenPageViews', 'sessions', 'bounceRate'],
  ['country', 'deviceCategory']
);
```

### 5. Via API Route (from client)

```typescript
const response = await fetch('/api/google-analytics/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    propertyId: '123456789',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    metrics: ['screenPageViews', 'sessions'],
    dimensions: ['country']
  })
});

const { report } = await response.json();
```

## Available Functions

### `getGoogleAnalyticsClient()`
Returns authenticated Google Analytics clients.

```typescript
const { analytics, analyticsData, oauth2Client } = await getGoogleAnalyticsClient();
```

### `getGA4Properties()`
Get all GA4 properties the user has access to.

### `runGA4Report(propertyId, dateRange, metrics, dimensions)`
Run a custom GA4 report.

**Parameters:**
- `propertyId` - GA4 property ID (e.g., "123456789")
- `dateRange` - Object with `startDate` and `endDate` (YYYY-MM-DD)
- `metrics` - Array of metric names (e.g., `['screenPageViews', 'sessions']`)
- `dimensions` - Optional array of dimension names (e.g., `['country', 'date']`)

### `getPageviews(propertyId, startDate, endDate)`
Get pageviews for a date range.

### `getConversions(propertyId, startDate, endDate)`
Get conversions and revenue for a date range.

### `hasGoogleAnalyticsAccess()`
Check if current user has granted GA access.

```typescript
const hasAccess = await hasGoogleAnalyticsAccess();
if (!hasAccess) {
  // Prompt user to sign in with Google
}
```

## Common GA4 Metrics

```typescript
const metrics = [
  'screenPageViews',       // Total pageviews
  'sessions',              // Total sessions
  'activeUsers',           // Active users
  'newUsers',              // New users
  'conversions',           // Total conversions
  'totalRevenue',          // Total revenue
  'bounceRate',            // Bounce rate
  'averageSessionDuration',// Avg session duration
  'eventCount',            // Total events
];
```

## Common GA4 Dimensions

```typescript
const dimensions = [
  'date',                  // Date
  'country',               // Country
  'city',                  // City
  'deviceCategory',        // Device type (desktop/mobile/tablet)
  'browser',               // Browser
  'landingPage',           // Landing page
  'pagePath',              // Page path
  'eventName',             // Event name
  'sessionSource',         // Traffic source
  'sessionMedium',         // Traffic medium
];
```

## Example: Build a Dashboard

```typescript
// app/analytics-dashboard/page.tsx
import { getGA4Properties, runGA4Report } from '@/lib/services/google-analytics';
import { requireAuth } from '@/lib/auth/require-auth';

export default async function AnalyticsDashboard() {
  await requireAuth(); // Ensure user is logged in

  // Get user's GA4 properties
  const properties = await getGA4Properties();

  if (properties.length === 0) {
    return <div>No Google Analytics properties found</div>;
  }

  // Use the first property
  const propertyId = properties[0].name!.split('/')[1];

  // Get last 30 days data
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Get report
  const report = await runGA4Report(
    propertyId,
    { startDate, endDate },
    ['screenPageViews', 'sessions', 'activeUsers'],
    ['date']
  );

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <h2>{properties[0].displayName}</h2>

      <div className="grid grid-cols-3 gap-4">
        {/* Display metrics */}
        {report.rows?.map((row, i) => (
          <div key={i}>
            <p>Date: {row.dimensionValues?.[0].value}</p>
            <p>Pageviews: {row.metricValues?.[0].value}</p>
            <p>Sessions: {row.metricValues?.[1].value}</p>
            <p>Users: {row.metricValues?.[2].value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Error Handling

The service throws errors if:
- User is not authenticated
- User hasn't signed in with Google (no OAuth token)
- Google API returns an error

Always wrap in try/catch:

```typescript
try {
  const properties = await getGA4Properties();
} catch (error) {
  if (error.message.includes('No Google OAuth token')) {
    // Redirect to login with Google
  } else {
    // Handle other errors
  }
}
```

## Checking Access

Before using GA functions, check if user has access:

```typescript
import { hasGoogleAnalyticsAccess } from '@/lib/services/google-analytics';

export default async function MyPage() {
  const hasAccess = await hasGoogleAnalyticsAccess();

  if (!hasAccess) {
    return (
      <div>
        <p>Please sign in with Google to access Analytics data</p>
        <a href="/login">Sign in with Google</a>
      </div>
    );
  }

  // ... rest of your page
}
```

## Token Refresh

Supabase automatically handles token refresh! The `provider_refresh_token` is stored and used to get new access tokens when they expire.

## Important Notes

1. **Sign in with Google required** - Users must use Google OAuth, not email/password
2. **User must grant permission** - Google will ask for Analytics access during OAuth
3. **Server-side only** - GA tokens should never be exposed to the client
4. **Rate limits** - Google Analytics API has quota limits
5. **GA4 recommended** - Universal Analytics is being deprecated

## Testing

1. Sign in with Google OAuth
2. Grant Analytics permission
3. Try fetching properties:

```bash
curl http://localhost:3000/api/google-analytics/properties
```

## Troubleshooting

### "No Google OAuth token found"
- User signed in with email/password instead of Google
- Solution: Sign out and sign in with Google

### "Insufficient permissions"
- User denied Analytics access during OAuth
- Solution: Sign out and sign in again, grant permission

### "Invalid credentials"
- OAuth token expired and refresh failed
- Solution: Sign out and sign in again

### "Property not found"
- User doesn't have access to that GA4 property
- Solution: Check property ID and user permissions in GA

## Next Steps

1. ✅ Sign in with Google to get Analytics access
2. ✅ Build your analytics dashboard
3. ✅ Use GA data for CRO insights
4. ✅ Combine with your existing analysis features

Happy analyzing! 📊
