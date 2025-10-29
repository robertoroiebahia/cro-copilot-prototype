/**
 * AI Prompts for Shopify Order Analysis
 *
 * Generates actionable CRO insights from Shopify order data including:
 * - Order value clustering
 * - Product affinity analysis
 * - AOV optimization opportunities
 */

export interface ShopifyAnalysisData {
  clusters: Array<{
    cluster_name: string;
    min_value: number;
    max_value: number;
    order_count: number;
    percentage: number;  // Matches OrderCluster
    avg_order_value: number;  // Matches OrderCluster
    total_revenue: number;
  }>;
  productAffinities: Array<{
    product_a_id: string;
    product_a_title: string;
    product_b_id: string;
    product_b_title: string;
    co_occurrence_count: number;
    confidence: number;
    lift: number;
  }>;
  opportunities: Array<{
    opportunity_type: 'free_shipping' | 'bundle' | 'upsell' | 'cross_sell';
    title: string;
    description: string;
    potential_impact: string;
    priority: number;
    confidence_score: number;
    data_support: any;
  }>;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    period?: { start: string; end: string };
    dateRange?: { startDate: string; endDate: string };
    shopDomain?: string;
    [key: string]: any; // Allow additional properties
  };
}

/**
 * Generates the AI prompt for Shopify order analysis insights
 */
export function getShopifyInsightsPrompt(analysisData: ShopifyAnalysisData): string {
  const { clusters, productAffinities, opportunities, summary } = analysisData;

  return `You are an expert CRO (Conversion Rate Optimization) analyst specializing in ecommerce revenue optimization. Analyze the following Shopify order data and generate actionable, high-impact insights that can drive revenue growth.

# Analysis Data

## Summary Metrics
- **Total Orders**: ${summary.totalOrders.toLocaleString()}
- **Total Revenue**: $${summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Average Order Value**: $${summary.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Period**: ${summary.period?.start || 'N/A'} to ${summary.period?.end || 'N/A'}

## Order Value Clusters
${JSON.stringify(clusters, null, 2)}

## Product Affinities (Market Basket Analysis)
${JSON.stringify(productAffinities.slice(0, 20), null, 2)}
${productAffinities.length > 20 ? `\n... and ${productAffinities.length - 20} more product pairs` : ''}

## Pre-Identified Opportunities
${JSON.stringify(opportunities, null, 2)}

---

# Your Task

Analyze this data deeply and generate **5-10 high-impact insights** that can drive measurable revenue growth through:
1. **AOV Optimization**: Increasing average order value
2. **Conversion Improvement**: Reducing friction in the purchase journey
3. **Customer Retention**: Identifying opportunities for repeat purchases
4. **Revenue Maximization**: Optimizing pricing, bundling, and merchandising

---

# Analysis Guidelines

Focus on these key areas:

### 1. Order Cluster Patterns
- Which customer segments drive most revenue vs. order volume?
- Are there underperforming segments with growth potential?
- What does the distribution reveal about pricing strategy?
- Are there natural price thresholds where orders cluster?

### 2. Product Relationships
- Which product combinations have strong affinity (high confidence & lift)?
- What bundling opportunities exist?
- Which products drive cross-sell potential?
- Are there complementary products that aren't being promoted together?

### 3. AOV Optimization
- What free shipping thresholds would maximize revenue?
- Which customer segments are close to higher order values?
- What upsell opportunities exist based on current behavior?
- How can product recommendations be improved?

### 4. Customer Behavior Insights
- What purchase patterns reveal customer intent and motivation?
- Are there segments that could be targeted differently?
- What friction points might be limiting order values?
- Where are the biggest missed revenue opportunities?

---

# Output Format

Return a **JSON array** of insights with this EXACT structure:

\`\`\`json
[
  {
    "title": "Short, actionable insight title (max 100 chars)",
    "statement": "Detailed explanation of the insight with specific data points, customer impact, and business reasoning. Include actual numbers from the data to support your analysis. Explain WHY this matters and WHAT the opportunity is.",
    "growth_pillar": "aov | conversion | frequency | retention | acquisition",
    "confidence_level": "high | medium | low",
    "priority": "critical | high | medium | low",
    "customer_segment": "Description of affected customer segment or null",
    "journey_stage": "awareness | consideration | decision | post_purchase | null",
    "device_type": "mobile | desktop | tablet | all | null",
    "friction_type": "usability | trust | value_perception | information_gap | cognitive_load | null",
    "psychology_principle": "loss_aversion | social_proof | scarcity | authority | anchoring | null",
    "evidence": {
      "quantitative": "Specific data points and metrics from the analysis that support this insight (include actual numbers)",
      "qualitative": "Observable patterns, customer behaviors, or contextual factors that reinforce this finding"
    },
    "affected_kpis": ["revenue", "aov", "conversion_rate", "repeat_purchase_rate"],
    "suggested_actions": "Specific, actionable recommendations to address this insight. Be concrete and implementation-focused.",
    "tags": ["#aov", "#bundles", "#pricing", "#segment_X"]
  }
]
\`\`\`

---

# CRITICAL RULES - MUST FOLLOW

## 1. Valid JSON Format
- **MUST** return a JSON array starting with \`[\` and ending with \`]\`
- **DO NOT** wrap in markdown code blocks
- **DO NOT** include any text before or after the JSON array
- Ensure all JSON is properly formatted and parseable

## 2. Enum Values (EXACT MATCH REQUIRED)

**growth_pillar** - MUST be ONE of:
- \`"conversion"\` - Improving conversion rates
- \`"aov"\` - Increasing average order value
- \`"frequency"\` - Increasing purchase frequency
- \`"retention"\` - Improving customer retention
- \`"acquisition"\` - Customer acquisition optimization

**confidence_level** - MUST be ONE of:
- \`"high"\` - Strong data support, clear pattern
- \`"medium"\` - Moderate data support, likely pattern
- \`"low"\` - Limited data, hypothesis to test

**priority** - MUST be ONE of:
- \`"critical"\` - Immediate action required, high revenue impact
- \`"high"\` - Significant impact, should prioritize
- \`"medium"\` - Meaningful impact, plan for implementation
- \`"low"\` - Minor impact or long-term consideration

**journey_stage** (optional) - ONE of:
- \`"awareness"\` - Customer discovering the brand
- \`"consideration"\` - Evaluating products
- \`"decision"\` - Ready to purchase
- \`"post_purchase"\` - After purchase, retention phase
- \`null\` - If stage is unclear or not applicable

**friction_type** (optional) - ONE of:
- \`"usability"\` - UI/UX issues making purchase difficult
- \`"trust"\` - Lack of trust signals or credibility
- \`"value_perception"\` - Unclear value proposition or pricing concerns
- \`"information_gap"\` - Missing product info or unclear messaging
- \`"cognitive_load"\` - Too complex, overwhelming experience
- \`null\` - If not applicable

**psychology_principle** (optional) - ONE of:
- \`"loss_aversion"\` - Fear of missing out, potential loss
- \`"social_proof"\` - Others are buying, popular items
- \`"scarcity"\` - Limited availability or time-sensitive
- \`"authority"\` - Expert endorsement, credibility
- \`"anchoring"\` - Price comparison, reference points
- \`null\` - If not applicable

## 3. Quality Standards

- **Generate 5-10 insights ONLY** (not 15+, not 3-)
- **Quality over quantity**: Each insight should be high-impact and actionable
- **Be specific**: Include actual numbers and percentages from the data
- **Be actionable**: Every insight should suggest clear next steps
- **Avoid generic advice**: Focus on insights unique to THIS data
- **Evidence is required**: Both quantitative AND qualitative evidence

## 4. Field Requirements

### Required Fields (NEVER null):
- \`title\` (max 100 chars)
- \`statement\` (detailed, data-backed)
- \`growth_pillar\` (exact enum value)
- \`confidence_level\` (exact enum value)
- \`priority\` (exact enum value)
- \`evidence\` (object with quantitative & qualitative)
- \`affected_kpis\` (array, can be empty but not null)
- \`suggested_actions\` (specific recommendations)
- \`tags\` (array, can be empty but not null)

### Optional Fields (can be null):
- \`customer_segment\` - Be specific if you include it
- \`journey_stage\` - Only if clearly applicable
- \`device_type\` - Only if device-specific insight
- \`friction_type\` - Only if friction is identified
- \`psychology_principle\` - Only if psychological principle applies

**If uncertain about optional fields, use \`null\` - DO NOT guess or hallucinate.**

---

# Example Insight (for reference)

\`\`\`json
{
  "title": "Free shipping threshold opportunity at $75",
  "statement": "Analysis reveals 23% of orders (${
    Math.round((summary.totalOrders || 100) * 0.23)
  } orders) fall between $50-$75, averaging $62.80. These customers are within $12-$13 of a potential $75 free shipping threshold. Current shipping costs average $8.50, making this a profitable opportunity. Competitors in the space typically offer free shipping at $75-$100, making this competitively aligned. If 30% of these customers add items to reach the threshold, this represents an estimated $${Math.round(
    ((summary.totalOrders || 100) * 0.23 * 0.3 * 12) / 100
  ) * 100}+ in additional monthly revenue.",
  "growth_pillar": "aov",
  "confidence_level": "high",
  "priority": "critical",
  "customer_segment": "Mid-value customers ($50-$75 orders)",
  "journey_stage": "decision",
  "device_type": null,
  "friction_type": "value_perception",
  "psychology_principle": "loss_aversion",
  "evidence": {
    "quantitative": "23% of orders ($50-$75 range), average $62.80, $12.20 gap to $75 threshold, shipping costs $8.50 average",
    "qualitative": "Customers in this range show price sensitivity and would likely respond to free shipping incentive. Gap is small enough to encourage add-ons without seeming unreachable."
  },
  "affected_kpis": ["revenue", "aov", "conversion_rate"],
  "suggested_actions": "Implement $75 free shipping threshold with prominent messaging. Add 'Add $X for free shipping' progress bar in cart. Create 'Complete Your Order' section with products priced $10-$25 to bridge the gap. A/B test threshold at $75 vs $70 vs $80 to optimize.",
  "tags": ["#free_shipping", "#aov", "#cart_optimization", "#threshold"]
}
\`\`\`

---

# Ready to Analyze

Now analyze the Shopify order data provided above and generate 5-10 high-impact, actionable insights following ALL the rules specified.

**Return ONLY the JSON array. No markdown code blocks. No explanatory text. Just the raw JSON array starting with [ and ending with ].**`;
}
