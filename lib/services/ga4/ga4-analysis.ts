/**
 * GA4 Analysis Service
 *
 * Treats GA4 funnel analysis like page analysis:
 * - Fetches data from GA4 (in memory)
 * - Calculates funnels and metrics
 * - Stores results in analysis record
 * - Generates insights
 * - No permanent raw event storage
 */

import { createClient } from '@/utils/supabase/server';
import { fetchGA4Events, FUNNEL_EVENTS } from './ga4-sync';
import { llmService } from '@/lib/services/ai/llm-service';

interface FunnelStep {
  name: string;
  event: string;
  users: number;
  conversion_rate: number;
  drop_off: number;
  drop_off_rate: number;
}

interface FunnelData {
  segment_label: string;
  segment_filter: any;
  overall_cvr: number;
  total_landing_users: number;
  total_purchases: number;
  funnel_data: {
    steps: FunnelStep[];
  };
}

interface GA4AnalysisResult {
  success: boolean;
  analysisId?: string;
  funnels?: FunnelData[];
  insights?: any[];
  error?: string;
}

/**
 * Calculate funnel from raw events (in memory)
 */
function calculateFunnelFromEvents(events: any[], segmentLabel: string = 'All Users'): FunnelData {
  const stepNames = {
    session_start: 'Landing',
    view_item: 'Product View',
    add_to_cart: 'Add to Cart',
    begin_checkout: 'Checkout',
    purchase: 'Purchase',
  };

  // Aggregate events by event name
  const eventCounts = new Map<string, number>();
  FUNNEL_EVENTS.forEach(eventName => {
    const count = events
      .filter(e => e.event_name === eventName)
      .reduce((sum, e) => sum + e.total_users, 0);
    eventCounts.set(eventName, count);
  });

  const totalLandingUsers = eventCounts.get('session_start') || 0;
  const totalPurchases = eventCounts.get('purchase') || 0;

  // Build funnel steps
  const steps: FunnelStep[] = [];
  let previousUsers = totalLandingUsers;

  FUNNEL_EVENTS.forEach((eventName, index) => {
    const users = eventCounts.get(eventName) || 0;
    const conversionRate = totalLandingUsers > 0 ? (users / totalLandingUsers) * 100 : 0;
    const dropOff = index > 0 ? previousUsers - users : 0;
    const dropOffRate = previousUsers > 0 ? (dropOff / previousUsers) * 100 : 0;

    steps.push({
      name: stepNames[eventName],
      event: eventName,
      users,
      conversion_rate: conversionRate,
      drop_off: dropOff,
      drop_off_rate: dropOffRate,
    });

    previousUsers = users;
  });

  const overallCvr = totalLandingUsers > 0 ? (totalPurchases / totalLandingUsers) * 100 : 0;

  return {
    segment_label: segmentLabel,
    segment_filter: {},
    overall_cvr: parseFloat(overallCvr.toFixed(2)),
    total_landing_users: totalLandingUsers,
    total_purchases: totalPurchases,
    funnel_data: { steps },
  };
}

/**
 * Generate insights from funnel data using LLM
 */
async function generateInsights(funnels: FunnelData[]): Promise<any[]> {
  const funnelSummary = funnels.map(f => ({
    segment: f.segment_label,
    overall_cvr: f.overall_cvr,
    landing_users: f.total_landing_users,
    purchases: f.total_purchases,
    steps: f.funnel_data.steps.map(step => ({
      name: step.name,
      users: step.users,
      conversion_rate: step.conversion_rate,
      drop_off_rate: step.drop_off_rate,
    })),
  }));

  const prompt = `You are a conversion rate optimization analyst. Analyze the following GA4 funnel data and generate insights.

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

  const response = await llmService.execute<any[]>({
    prompt,
    provider: 'claude',
    maxTokens: 4000,
  });

  if (!response.success || !response.data) {
    return [];
  }

  return response.data;
}

/**
 * Run GA4 funnel analysis
 * - Fetches data from GA4
 * - Calculates funnels
 * - Stores as analysis record
 * - Generates insights
 */
export async function runGA4Analysis(
  workspaceId: string,
  userId: string,
  startDate: string,
  endDate: string,
  generateAIInsights: boolean = true
): Promise<GA4AnalysisResult> {
  try {
    // Step 1: Fetch GA4 events (in memory only)
    console.log('Fetching GA4 events...');
    const events = await fetchGA4Events(workspaceId, startDate, endDate);

    if (events.length === 0) {
      return {
        success: false,
        error: 'No GA4 data found for this date range',
      };
    }

    // Step 2: Calculate funnels (in memory)
    console.log('Calculating funnels...');
    const mainFunnel = calculateFunnelFromEvents(events, 'All Users');
    const funnels = [mainFunnel];

    // Step 3: Create analysis record
    console.log('Creating analysis record...');
    const supabase = createClient();

    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        url: `GA4 Funnel Analysis (${startDate} to ${endDate})`,
        research_type: 'ga_analysis',
        metrics: {
          date_range: { start: startDate, end: endDate },
          overall_cvr: mainFunnel.overall_cvr,
          total_landing_users: mainFunnel.total_landing_users,
          total_purchases: mainFunnel.total_purchases,
          funnels: funnels, // Store funnel data here
          events_analyzed: events.length,
        },
        context: {
          analysis_type: 'ga4_funnel',
          segments: funnels.map(f => f.segment_label),
        },
        summary: {
          overall_cvr: `${mainFunnel.overall_cvr}%`,
          date_range: `${startDate} to ${endDate}`,
        },
        status: 'completed',
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Failed to create analysis:', analysisError);
      return {
        success: false,
        error: `Failed to create analysis: ${analysisError.message}`,
      };
    }

    const analysisId = analysisRecord.id;

    // Step 4: Generate AI insights (optional)
    let insights: any[] = [];

    if (generateAIInsights) {
      console.log('Generating AI insights...');
      const aiInsights = await generateInsights(funnels);

      // Save insights to both ga4_funnel_insights and main insights table
      for (const insight of aiInsights) {
        // Save to GA4-specific table
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

        // Transform to standard insights format
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
          growth_pillar: 'conversion',
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
          journey_stage: 'decision',
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

        const { error: insightError } = await supabase
          .from('insights')
          .insert(standardInsight);

        if (!insightError) {
          insights.push(insight);
        }
      }
    }

    return {
      success: true,
      analysisId,
      funnels,
      insights,
    };
  } catch (error) {
    console.error('GA4 analysis failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get GA4 analysis results from database
 */
export async function getGA4Analysis(workspaceId: string, analysisId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', analysisId)
    .eq('research_type', 'ga_analysis')
    .single();

  if (error) {
    throw new Error(`Failed to fetch analysis: ${error.message}`);
  }

  return data;
}

/**
 * Get latest GA4 analysis for workspace
 */
export async function getLatestGA4Analysis(workspaceId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('research_type', 'ga_analysis')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data;
}
