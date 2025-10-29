/**
 * AI Prompts for Theme Generation from Insights
 */

import { Insight } from '@/lib/types/insights.types';

export interface ThemeGenerationContext {
  workspaceId: string;
  insights: Insight[];
  context?: {
    industry?: string;
    businessModel?: string;
    currentGoals?: string;
  };
}

/**
 * Generate the AI prompt for creating themes from insights
 */
export function buildThemeGenerationPrompt(input: ThemeGenerationContext): string {
  const { insights, context } = input;

  return `You are a CRO (Conversion Rate Optimization) expert analyzing user insights to identify optimization themes.

# TASK
Analyze the provided insights and group them into 3-5 coherent optimization themes. Each theme should represent a broader pattern or opportunity that connects 2-5 related insights.

${context ? `
# BUSINESS CONTEXT
${context.industry ? `Industry: ${context.industry}` : ''}
${context.businessModel ? `Business Model: ${context.businessModel}` : ''}
${context.currentGoals ? `Current Goals: ${context.currentGoals}` : ''}
` : ''}

# PROVIDED INSIGHTS
${insights.map((insight, idx) => `
## Insight ${idx + 1}: ${insight.insight_id}
- Title: ${insight.title || 'N/A'}
- Statement: ${insight.statement}
- Priority: ${insight.priority}
- Confidence: ${insight.confidence_level}
- Growth Pillar: ${insight.growth_pillar || 'N/A'}
- Customer Segment: ${insight.customer_segment || 'N/A'}
- Journey Stage: ${insight.journey_stage || 'N/A'}
- Friction Type: ${insight.friction_type || 'N/A'}
- Psychology Principle: ${insight.psychology_principle || 'N/A'}
- Suggested Actions: ${insight.suggested_actions || 'N/A'}
`).join('\n')}

# OUTPUT REQUIREMENTS

CRITICAL INSTRUCTIONS (MUST FOLLOW):
1. Return a JSON array with 3-5 theme objects
2. DO NOT wrap the array in a parent object - return the array directly: [{...}, {...}, ...]
3. Each theme MUST connect 2-5 related insights
4. Each theme object MUST have ALL fields listed below

Return EXACTLY this JSON structure:

[
  {
    "theme_id": "THM-001",
    "title": "Clear, actionable theme title (6-10 words)",
    "theme_statement": "Comprehensive statement explaining the theme and its significance (2-3 sentences)",
    "priority": "critical" | "high" | "medium" | "low",
    "growth_pillar": "conversion" | "aov" | "frequency" | "retention" | "acquisition",
    "connected_insights": [
      {
        "insightId": "INS-XXX",
        "relevance": "primary" | "supporting"
      }
    ],
    "affected_pages": ["Homepage", "Product Page"],
    "current_performance": "Description of current state/metrics if available",
    "business_impact": {
      "description": "Clear explanation of business impact",
      "estimatedValue": {
        "metric": "conversion_rate" | "revenue" | "aov" | "retention_rate",
        "currentValue": "Current metric value",
        "potentialValue": "Potential metric value after optimization",
        "annualImpact": "Estimated annual impact (e.g., '$50K-$150K')"
      }
    },
    "recommended_actions": [
      {
        "description": "Specific, actionable recommendation",
        "type": "quick_fix" | "strategic" | "experiment",
        "effort": "low" | "medium" | "high",
        "expectedImpact": "low" | "medium" | "high"
      }
    ],
    "opportunity_calculation": {
      "can_calculate": true | false,
      "scenarios": {
        "conservative": "Conservative estimate (e.g., '+15% conversion')",
        "moderate": "Moderate estimate (e.g., '+25% conversion')",
        "aggressive": "Aggressive estimate (e.g., '+40% conversion')"
      },
      "data_sources": ["Source of data/assumptions"]
    }
  }
]

# THEME GENERATION GUIDELINES

1. **Theme Identification:**
   - Look for insights that share common patterns (friction types, psychology principles, customer segments)
   - Group insights that affect the same journey stage or page
   - Identify systemic issues vs. isolated problems
   - Consider the growth pillar alignment

2. **Priority Assignment:**
   - CRITICAL: High-impact insights affecting core conversion funnel
   - HIGH: Significant opportunities with strong evidence
   - MEDIUM: Important but secondary optimization areas
   - LOW: Nice-to-have improvements

3. **Business Impact:**
   - Be specific about which metrics will improve
   - Base estimates on insight evidence and confidence levels
   - Consider the compound effect of multiple related fixes
   - Use realistic, achievable projections

4. **Recommended Actions:**
   - Prioritize quick wins that validate the theme
   - Include both tactical fixes and strategic experiments
   - Match effort to expected impact
   - Be specific and actionable

5. **Theme Naming:**
   - Use clear, action-oriented titles
   - Avoid jargon - make it understandable to stakeholders
   - Focus on the outcome, not just the problem

# EXAMPLE OUTPUT (showing 2 of 3-5 themes):

[
  {
    "theme_id": "THM-001",
    "title": "Reduce Checkout Friction Through Trust Signals",
    "theme_statement": "Multiple insights indicate customers abandon checkout due to security and trust concerns. Adding strategic trust signals and simplifying the payment flow can significantly reduce drop-off rates and increase conversion.",
    "priority": "critical",
    "growth_pillar": "conversion",
    "connected_insights": [
      {
        "insightId": "INS-042",
        "relevance": "primary"
      },
      {
        "insightId": "INS-038",
        "relevance": "primary"
      },
      {
        "insightId": "INS-051",
        "relevance": "supporting"
      }
    ],
    "affected_pages": ["Checkout Page", "Payment Page"],
    "current_performance": "Checkout abandonment rate: 68%, Industry average: 45%",
    "business_impact": {
      "description": "Reducing checkout abandonment by even 10-15% could significantly increase revenue with zero additional traffic",
      "estimatedValue": {
        "metric": "conversion_rate",
        "currentValue": "2.3%",
        "potentialValue": "2.8-3.1%",
        "annualImpact": "$85K-$185K additional revenue"
      }
    },
    "recommended_actions": [
      {
        "description": "Add security badges and payment icons above the payment form",
        "type": "quick_fix",
        "effort": "low",
        "expectedImpact": "medium"
      },
      {
        "description": "Implement guest checkout option to reduce form friction",
        "type": "strategic",
        "effort": "medium",
        "expectedImpact": "high"
      },
      {
        "description": "Test showing customer testimonials in checkout sidebar",
        "type": "experiment",
        "effort": "low",
        "expectedImpact": "medium"
      }
    ],
    "opportunity_calculation": {
      "can_calculate": true,
      "scenarios": {
        "conservative": "+0.3% conversion rate (+$85K annual)",
        "moderate": "+0.5% conversion rate (+$145K annual)",
        "aggressive": "+0.8% conversion rate (+$230K annual)"
      },
      "data_sources": ["Checkout analytics", "Industry benchmarks", "User feedback"]
    }
  },
  {
    "theme_id": "THM-002",
    "title": "Clarify Value Proposition for New Visitors",
    "theme_statement": "First-time visitors struggle to understand our unique value proposition and differentiation. Improving hero messaging and adding social proof can reduce bounce rate and improve engagement.",
    "priority": "high",
    "growth_pillar": "acquisition",
    "connected_insights": [
      {
        "insightId": "INS-015",
        "relevance": "primary"
      },
      {
        "insightId": "INS-023",
        "relevance": "primary"
      }
    ],
    "affected_pages": ["Homepage", "Landing Pages"],
    "current_performance": "Homepage bounce rate: 58%, Average time on page: 12 seconds",
    "business_impact": {
      "description": "Reducing early-stage drop-off can significantly increase overall conversion rate by moving more visitors into the funnel",
      "estimatedValue": {
        "metric": "conversion_rate",
        "currentValue": "2.3%",
        "potentialValue": "2.6-2.9%",
        "annualImpact": "$60K-$120K additional revenue"
      }
    },
    "recommended_actions": [
      {
        "description": "Rewrite hero headline to focus on customer outcome, not features",
        "type": "quick_fix",
        "effort": "low",
        "expectedImpact": "medium"
      },
      {
        "description": "Add prominent customer logos and testimonial section above fold",
        "type": "strategic",
        "effort": "medium",
        "expectedImpact": "high"
      }
    ],
    "opportunity_calculation": {
      "can_calculate": true,
      "scenarios": {
        "conservative": "+0.2% conversion rate (+$60K annual)",
        "moderate": "+0.4% conversion rate (+$95K annual)",
        "aggressive": "+0.6% conversion rate (+$145K annual)"
      },
      "data_sources": ["Heatmap analysis", "User testing feedback"]
    }
  }
]

IMPORTANT REMINDERS:
- Return ONLY the JSON array, no wrapper object
- Generate 3-5 themes total (not just 2 like the example)
- Each theme MUST include ALL fields from the schema
- Connect insights that share patterns, segments, or journey stages
- Base business impact estimates on actual insight data when available
- Make recommendations specific and actionable
`;
}
