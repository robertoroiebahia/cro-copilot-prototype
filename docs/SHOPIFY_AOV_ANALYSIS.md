# Shopify AOV Analysis Implementation

**Date:** October 29, 2025
**Status:** ✅ Complete and Production Ready

---

## Overview

Complete implementation of Shopify Average Order Value (AOV) analysis feature, including order clustering, product affinity analysis (market basket), and test opportunity generation.

---

## Features Implemented

### 1. **Order Value Clustering**
Groups orders into value ranges and analyzes:
- Order count and percentage per cluster
- Revenue distribution
- Average order value per segment
- Identifies largest customer segments

**Clusters:**
- $0-$25
- $25-$50
- $50-$100
- $100-$150
- $150-$200
- $200-$300
- $300+

### 2. **Product Affinity Analysis**
Market basket analysis showing products frequently bought together:
- **Support:** % of orders containing both products
- **Confidence:** P(B|A) - probability of buying B when buying A
- **Lift:** Association strength (>1 = positive correlation)

Filters for minimum confidence (30%) and minimum co-occurrences (3 orders)

### 3. **AOV Opportunities**
AI-generated test recommendations with priority scores:
- **Free Shipping Thresholds:** Based on order clusters near common thresholds
- **Bundle Opportunities:** Based on product affinities
- **Upsell Strategies:** Targeting upgrade opportunities
- **Cross-sell Recommendations:** Complementary product suggestions

Each opportunity includes:
- Confidence score (1-10)
- Effort score (1-10)
- Revenue impact score (1-10)
- Expected impact metrics
- Supporting data
- Statistical readiness

---

## Architecture

### Database Schema

#### New Tables (Migration 021)

**`shopify_connections`**
```sql
- id (UUID)
- workspace_id (FK)
- shop_domain
- access_token_encrypted (AES-256-GCM)
- shop_name
- currency
- is_active
- last_sync_at
```

**`shopify_orders`**
```sql
- id (UUID)
- workspace_id (FK)
- connection_id (FK)
- shopify_order_id
- order_number
- customer_email, customer_id
- total_price, subtotal_price, total_tax
- total_discounts, shipping_price
- currency
- financial_status, fulfillment_status
- line_items (JSONB)
- shipping_address, billing_address (JSONB)
- shopify_created_at
```

**`order_clusters`**
```sql
- id (UUID)
- workspace_id (FK)
- analysis_id (FK)
- cluster_name (e.g., "$0-$50")
- min_value, max_value
- order_count
- percentage_of_orders
- total_revenue
- percentage_of_revenue
- average_order_value
```

**`product_affinity`**
```sql
- id (UUID)
- workspace_id (FK)
- analysis_id (FK)
- product_a_id, product_a_title
- product_b_id, product_b_title
- support, confidence, lift
- pair_count
- product_a_count, product_b_count
- total_orders
```

**`aov_opportunities`**
```sql
- id (UUID)
- workspace_id (FK)
- analysis_id (FK)
- title, description
- category (free_shipping, bundle, pricing, cross_sell)
- priority (critical, high, medium, low)
- test_idea (JSONB)
- expected_impact (JSONB)
- confidence_score, effort_score, revenue_impact_score
- statistical_readiness (JSONB)
- supporting_data (JSONB)
- status
```

#### Updated Tables (Migration 022 & 023)

**`analyses`** - Made flexible for multiple research types:
```sql
-- Page-analysis specific (NOW NULLABLE):
- url
- metrics
- context

-- Generic flexible fields (NEW):
- input_data JSONB  -- For storing varied input parameters
- insights JSONB    -- For analysis-specific results

-- Required for all types:
- user_id (NOT NULL)
- workspace_id (NOT NULL)
- research_type (NOT NULL)
- summary (NOT NULL)
```

### File Structure

```
lib/services/shopify/
  ├── shopify-client.ts      # Shopify REST API client
  ├── order-sync.ts          # Order data fetching & syncing
  └── aov-analysis.ts        # AOV analysis algorithms

app/api/shopify/
  ├── callback/route.ts      # OAuth callback handler
  ├── connections/route.ts   # Get/manage connections
  ├── sync/route.ts          # Sync order data
  ├── analyze/route.ts       # Run AOV analysis
  └── test-connection/route.ts # Diagnostic tool

app/analyze/shopify-orders/
  └── page.tsx               # Main analysis UI

components/shopify/
  ├── OrderClustersChart.tsx     # Horizontal bar chart
  ├── ProductAffinityGrid.tsx    # Affinity matrix
  └── AOVOpportunitiesList.tsx   # Test recommendations
```

---

## API Endpoints

### `POST /api/shopify/sync`
Syncs orders from Shopify store to database.

**Request:**
```json
{
  "workspaceId": "uuid",
  "connectionId": "uuid",
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-10-29"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "ordersFetched": 150,
    "ordersSynced": 150,
    "newOrders": 50,
    "updatedOrders": 100,
    "syncedAt": "2025-10-29T12:00:00Z"
  }
}
```

### `POST /api/shopify/analyze`
Runs AOV analysis on synced orders.

**Request:**
```json
{
  "workspaceId": "uuid",
  "connectionId": "uuid",
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-10-29"
  },
  "minConfidence": 0.3
}
```

**Response:**
```json
{
  "success": true,
  "analysisId": "uuid",
  "results": {
    "summary": {
      "totalOrders": 150,
      "totalRevenue": 12500,
      "averageOrderValue": 83.33,
      "period": {...}
    },
    "clusters": [...],
    "productAffinities": [...],
    "opportunities": [...]
  }
}
```

### `GET /api/shopify/analyze?analysisId=xxx`
Retrieves existing analysis results.

### `GET /api/shopify/test-connection?connectionId=xxx&workspaceId=xxx`
Tests Shopify API access and OAuth scopes.

**Response:**
```json
{
  "success": true,
  "tests": {
    "shop": { "status": 200, "success": true },
    "orders": { "status": 200, "success": true },
    "products": { "status": 200, "success": true }
  },
  "recommendation": "All tests passed!"
}
```

---

## Algorithms

### 1. Order Clustering Algorithm

```typescript
function analyzeOrderClusters(orders: Order[]): OrderCluster[] {
  const ranges = [
    { name: '$0-$25', min: 0, max: 25 },
    { name: '$25-$50', min: 25, max: 50 },
    // ... more ranges
  ];

  return ranges.map(range => {
    const ordersInRange = orders.filter(
      order => order.total_price >= range.min && order.total_price < range.max
    );

    return {
      cluster_name: range.name,
      order_count: ordersInRange.length,
      percentage_of_orders: (ordersInRange.length / orders.length) * 100,
      total_revenue: sum(ordersInRange.map(o => o.total_price)),
      average_order_value: avg(ordersInRange.map(o => o.total_price))
    };
  });
}
```

### 2. Market Basket Analysis

```typescript
function analyzeProductAffinity(orders: Order[]): ProductAffinity[] {
  // Extract all product pairs from orders
  const pairs = orders.flatMap(order => {
    const products = order.line_items;
    return combinations(products, 2); // All 2-product combinations
  });

  // Calculate metrics for each pair
  return pairs.map(([productA, productB]) => {
    const ordersWithA = countOrdersWith(productA);
    const ordersWithB = countOrdersWith(productB);
    const ordersWithBoth = countOrdersWith(productA, productB);

    return {
      support: ordersWithBoth / totalOrders,
      confidence: ordersWithBoth / ordersWithA,
      lift: (ordersWithBoth / totalOrders) / (ordersWithA / totalOrders * ordersWithB / totalOrders)
    };
  }).filter(pair =>
    pair.confidence >= 0.3 && // Minimum 30% confidence
    pair.ordersWithBoth >= 3   // Minimum 3 co-occurrences
  );
}
```

### 3. Opportunity Generation

Identifies test opportunities based on:
1. **Free Shipping:** Clusters near common thresholds ($50, $75, $100)
2. **Bundles:** High-affinity product pairs (lift > 1.5)
3. **Upsells:** Customers in lower clusters with high-value potential
4. **Cross-sells:** Related products with moderate affinity

Each opportunity scored on:
- **Confidence (1-10):** How certain we are it will work
- **Effort (1-10):** Implementation difficulty
- **Revenue Impact (1-10):** Potential revenue lift

---

## Security & Privacy

### OAuth Flow
1. User clicks "Connect Shopify"
2. Redirected to Shopify with scopes: `read_orders`, `read_products`, `read_customers`, `read_analytics`
3. OAuth callback receives access token
4. Token encrypted with AES-256-GCM using `ENCRYPTION_KEY` env var
5. Stored in `shopify_connections.access_token_encrypted`

### Encryption
```typescript
import crypto from 'crypto';

export function encrypt(text: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

### Row Level Security
All Shopify tables have RLS policies:
```sql
CREATE POLICY "Users access their workspace data"
  ON shopify_orders FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE user_id = auth.uid()
  ));
```

---

## UI Components

### OrderClustersChart
Horizontal bar chart showing order distribution across value ranges.
- Highlights largest segment with green styling
- Shows order count, percentage, avg value, and revenue per cluster
- Responsive design with mobile support

### ProductAffinityGrid
Grid displaying product pairs with high purchase correlation.
- Color-coded by affinity strength (Very Strong, Strong)
- Shows confidence, lift, and co-occurrence count
- Sortable and filterable

### AOVOpportunitiesList
Prioritized list of test recommendations.
- Priority badges (Critical, High, Medium, Low)
- Expandable details with test ideas and expected impact
- Data support section showing statistical readiness
- Status tracking (Pending, Testing, Implemented)

---

## Navigation

### Desktop (AppSidebar)
Added "Shopify AOV" item under Analysis section with:
- Shopping bag icon
- PRO badge (if user is not on PRO plan)
- Active state highlighting

### Mobile (MobileHeader)
Same functionality in mobile navigation menu.

---

## Error Handling

### Sync Errors
- **207 Multi-Status:** Shows partial success with error details
- **500 Internal Server Error:** Shows decryption/API errors
- **403 Forbidden:** Indicates missing OAuth scopes

### Diagnostic Tool
Test Connection endpoint validates:
1. ✅ Shop access (basic API connectivity)
2. ✅ Orders access (read_orders scope)
3. ✅ Products access (read_products scope)

Provides actionable recommendations if tests fail.

---

## Known Issues & Fixes

### Issue 1: NOT NULL Constraints
**Problem:** Original `analyses` table had NOT NULL constraints on page-analysis fields.

**Fix:** Migration 023 made `url`, `metrics`, `context` nullable to support multiple research types.

### Issue 2: Missing user_id
**Problem:** Analysis inserts were missing `user_id` field.

**Fix:** Added `user_id: user.id` to all analysis insert statements.

### Issue 3: Authorization Field Mismatch
**Problem:** Some endpoints used `owner_id` instead of `user_id`.

**Fix:** Standardized on `user_id` based on actual schema.

---

## Testing

### Manual Testing Checklist
- [x] OAuth flow completes successfully
- [x] Access token is encrypted and stored
- [x] Order sync fetches all orders in date range
- [x] Analysis generates clusters correctly
- [x] Product affinities calculated with correct metrics
- [x] Opportunities are prioritized and scored
- [x] Test connection diagnostic works
- [x] UI displays all visualizations correctly
- [x] Navigation includes Shopify AOV with PRO badge
- [x] RLS policies prevent unauthorized access

### Test Data Requirements
- Minimum 50 orders for meaningful analysis
- Multiple products per order for affinity analysis
- Date range of at least 30 days

---

## Future Enhancements

1. **Real-time Sync:** Webhook integration for automatic order updates
2. **Segmentation:** Filter analysis by customer cohorts
3. **Time-series:** Track AOV trends over time
4. **A/B Testing Integration:** Connect opportunities to experiment tracking
5. **Export:** Download analysis results as CSV/PDF
6. **Benchmarking:** Compare against industry averages
7. **Predictive Analytics:** ML-based AOV forecasting

---

## Environment Variables

```bash
# Shopify OAuth
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
SHOPIFY_APP_URL=https://yourdomain.com

# Encryption
ENCRYPTION_KEY=your_64_char_hex_key  # Generate with: openssl rand -hex 32

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Deployment Checklist

- [x] Migrations 021, 022, 023 applied to production
- [x] Environment variables configured
- [x] Shopify app created and configured
- [x] OAuth redirect URLs whitelisted
- [x] RLS policies enabled on all tables
- [x] Encryption key securely stored
- [x] Build passes without errors
- [x] Documentation updated

---

## References

- [Shopify REST Admin API Docs](https://shopify.dev/docs/api/admin-rest)
- [Market Basket Analysis](https://en.wikipedia.org/wiki/Affinity_analysis)
- [Database Schema Documentation](./DATABASE_SCHEMA.md)
- [Architecture Guide](../ARCHITECTURE.md)
- [Shopify Integration Complete](./SHOPIFY_INTEGRATION_COMPLETE.md)
