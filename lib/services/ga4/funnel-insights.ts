import { createClient } from '@/utils/supabase/server';
import { getAllFunnels, FunnelData } from './funnel-calculator';
import { llmService } from '@/lib/services/ai/llm-service';

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

    // Call LLM service (uses latest model automatically)
    const response = await llmService.execute<FunnelInsight[]>({
      prompt,
      provider: 'claude', // Use Claude for consistency with rest of system
      maxTokens: 4000,
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        insightsCount: 0,
        error: response.error || 'Failed to generate insights',
      };
    }

    // Get insights from response
    const insights = response.data;

    if (insights.length === 0) {
      return {
        success: false,
        insightsCount: 0,
        error: 'No insights generated',
      };
    }

    // Create analysis record for GA4 funnel analysis
    const supabase = createClient();

    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        workspace_id: workspaceId,
        url: `GA4 Funnel Analysis (${startDate} to ${endDate})`,
        research_type: 'ga_analysis',
        metrics: {
          date_range: { start: startDate, end: endDate },
          funnels_analyzed: funnels.length,
        },
        context: {
          analysis_type: 'ga4_funnel',
          segments: funnels.map(f => f.segment_label),
        },
        summary: {
          insights_generated: insights.length,
          date_range: `${startDate} to ${endDate}`,
        },
        status: 'completed',
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Failed to create analysis record:', analysisError);
      return {
        success: false,
        insightsCount: 0,
        error: `Failed to create analysis: ${analysisError.message}`,
      };
    }

    const analysisId = analysisRecord.id;

    // Transform and save insights to both tables
    for (const insight of insights) {
      // Save to GA4-specific table (for GA4 metadata)
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

      // Transform to standard insights format for unified view
      const standardInsight = {
        analysis_id: analysisId,
        workspace_id: workspaceId,
        insight_id: `INS-GA4-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
        research_type: 'ga_analysis',
        source_type: 'automated',
        source_url: `GA4 Funnel Analysis`,

        // Core fields
        title: insight.observation.substring(0, 100),
        statement: insight.observation,
        growth_pillar: 'conversion', // GA4 funnels are primarily about conversion
        confidence_level: insight.confidence,
        priority: insight.impact,

        // Evidence
        evidence: {
          quantitative: {
            data_points: insight.data_points,
          },
        },
        sources: {
          primary: {
            type: 'analytics',
            name: 'Google Analytics 4',
            date: new Date().toISOString(),
          },
        },

        // Context
        customer_segment: insight.primary_segment || 'All Users',
        journey_stage: 'decision', // Funnels are decision-stage
        page_location: ['funnel'],
        device_type: insight.primary_segment?.toLowerCase().includes('mobile') ? 'mobile' :
                     insight.primary_segment?.toLowerCase().includes('desktop') ? 'desktop' :
                     insight.primary_segment?.toLowerCase().includes('tablet') ? 'tablet' : null,

        // Categorization
        friction_type: insight.insight_type === 'drop_off' ? 'usability' : null,
        tags: [
          '#ga4',
          '#funnel',
          `#${insight.insight_type}`,
          insight.primary_segment ? `#${insight.primary_segment.toLowerCase().replace(/\s+/g, '_')}` : null,
        ].filter(Boolean),
        affected_kpis: ['Conversion Rate', 'Drop-off Rate'],

        // Actions
        validation_status: 'untested',
        status: 'draft',
      };

      // Save to main insights table
      const { error: insightError } = await supabase
        .from('insights')
        .insert(standardInsight);

      if (insightError) {
        console.error('Failed to save insight to main table:', insightError);
      }
    }

    return {
      success: true,
      insightsCount: insights.length,
      analysisId,
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
