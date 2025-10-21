import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { getAllFunnels, FunnelData } from './funnel-calculator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface FunnelInsight {
  insight_type: 'gap_analysis' | 'segment_comparison' | 'drop_off' | 'anomaly' | 'temporal_pattern';
  observation: string;
  data_points: Record<string, any>;
  impact: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  primary_segment?: string;
  comparison_segment?: string;
}

/**
 * Generate prompt for AI insight generation
 */
function buildInsightPrompt(funnels: any[]): string {
  // Format funnels for AI consumption
  const funnelSummary = funnels.map(f => ({
    segment: f.segment_label,
    overall_cvr: f.overall_cvr,
    landing_users: f.total_landing_users,
    purchases: f.total_purchases,
    steps: f.funnel_data.steps.map((step: any) => ({
      name: step.name,
      users: step.users,
      conversion_rate: step.conversion_rate,
      drop_off_rate: step.drop_off_rate,
    })),
  }));

  return `You are a conversion rate optimization analyst. Analyze the following GA4 funnel data and generate insights.

# Funnel Data
${JSON.stringify(funnelSummary, null, 2)}

# Funnel Steps
1. Landing (session_start)
2. Product View (view_item)
3. Add to Cart (add_to_cart)
4. Checkout (begin_checkout)
5. Purchase (purchase)

# Your Task
Generate 5-10 insights from this funnel data. Focus on:
- Conversion gaps (actual vs expected)
- Segment disparities (mobile vs desktop, new vs returning, etc.)
- Drop-off points (biggest leaks in the funnel)
- Anomalies (unusual patterns)
- Temporal patterns (if comparing time periods)

# Important Rules
- DO NOT make recommendations or suggest tests
- DO NOT create hypotheses
- ONLY observe and report what the data shows
- Use specific numbers from the data
- Be objective and factual

# Output Format
Return a JSON array of insights with this structure:
[
  {
    "insight_type": "gap_analysis | segment_comparison | drop_off | anomaly | temporal_pattern",
    "observation": "Clear statement of what is observed (no recommendations)",
    "data_points": {
      "segment": "Mobile",
      "metric": "drop_off_rate",
      "value": 45.2,
      "comparison_value": 28.5,
      "difference": 16.7
    },
    "impact": "critical | high | medium | low",
    "confidence": "high | medium | low",
    "primary_segment": "Mobile",
    "comparison_segment": "Desktop"
  }
]

Generate insights now. Return ONLY the JSON array, no other text.`;
}

/**
 * Parse AI response into insights
 */
function parseInsights(response: string): FunnelInsight[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();

    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }

    const insights = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(insights)) {
      throw new Error('Response is not an array');
    }

    return insights;
  } catch (error) {
    console.error('Failed to parse insights:', error);
    return [];
  }
}

/**
 * Generate insights using Claude
 */
export async function generateFunnelInsights(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; insightsCount: number; error?: string }> {
  try {
    // Get all funnels for date range
    const funnels = await getAllFunnels(workspaceId, startDate, endDate);

    if (funnels.length === 0) {
      return {
        success: false,
        insightsCount: 0,
        error: 'No funnels found for this date range',
      };
    }

    // Build prompt
    const prompt = buildInsightPrompt(funnels);

    // Call Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse insights
    const insights = parseInsights(responseText);

    if (insights.length === 0) {
      return {
        success: false,
        insightsCount: 0,
        error: 'No insights generated',
      };
    }

    // Store insights in database
    const supabase = createClient();

    for (const insight of insights) {
      await supabase.from('ga4_funnel_insights').insert({
        workspace_id: workspaceId,
        insight_type: insight.insight_type,
        observation: insight.observation,
        data_points: insight.data_points,
        impact: insight.impact,
        confidence: insight.confidence,
        primary_segment: insight.primary_segment,
        comparison_segment: insight.comparison_segment,
      });
    }

    return {
      success: true,
      insightsCount: insights.length,
    };
  } catch (error) {
    console.error('Insight generation failed:', error);
    return {
      success: false,
      insightsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get funnel insights for a workspace
 */
export async function getFunnelInsights(
  workspaceId: string,
  limit: number = 20
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('ga4_funnel_insights')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch insights: ${error.message}`);
  }

  return data || [];
}

/**
 * Get insights by type
 */
export async function getInsightsByType(
  workspaceId: string,
  insightType: FunnelInsight['insight_type']
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('ga4_funnel_insights')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('insight_type', insightType)
    .order('impact', { ascending: true }) // Critical first
    .order('generated_at', { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Failed to fetch insights: ${error.message}`);
  }

  return data || [];
}

/**
 * Get critical insights
 */
export async function getCriticalInsights(workspaceId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('ga4_funnel_insights')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('impact', 'critical')
    .order('generated_at', { ascending: false})
    .limit(5);

  if (error) {
    throw new Error(`Failed to fetch critical insights: ${error.message}`);
  }

  return data || [];
}
