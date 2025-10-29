/**
 * Shopify Insights Generation Service
 *
 * Generates AI-powered CRO insights from Shopify order analysis data.
 * Follows the universal analysis pattern: Data → AI → Insights → Storage
 */

import { createClient } from '@/utils/supabase/server';
import { llmService } from '@/lib/services/ai/llm-service';
import { getShopifyInsightsPrompt, type ShopifyAnalysisData } from '@/lib/services/ai/prompts/shopify-prompts';
import type { Insight } from '@/lib/types/insights.types';

export interface ShopifyInsightGenerationResult {
  analysisId: string;
  insights: Insight[];
  insightCount: number;
  summary: any;
}

/**
 * Generate AI insights from Shopify order analysis
 *
 * This is the main entry point for Shopify insight generation.
 * It follows the standard pattern:
 * 1. Create analysis record
 * 2. Generate insights with AI
 * 3. Store in insights table
 * 4. Return results
 */
export async function generateShopifyInsights(
  userId: string,
  workspaceId: string,
  connectionId: string,
  analysisData: ShopifyAnalysisData
): Promise<ShopifyInsightGenerationResult> {
  const supabase = await createClient();

  try {
    console.log('[Shopify Insights] Starting insight generation for workspace:', workspaceId);

    // 1. Create analysis record
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        research_type: 'shopify_order_analysis',
        name: `Shopify AOV Analysis - ${new Date().toLocaleDateString()}`,
        input_data: {
          connectionId,
          dateRange: analysisData.summary.period,
          shopDomain: analysisData.summary.shopDomain || null,
        },
        summary: {
          totalOrders: analysisData.summary.totalOrders,
          totalRevenue: analysisData.summary.totalRevenue,
          averageOrderValue: analysisData.summary.averageOrderValue,
          period: analysisData.summary.period,
          clusterCount: analysisData.clusters.length,
          affinityPairCount: analysisData.productAffinities.length,
          opportunityCount: analysisData.opportunities.length,
        },
        status: 'completed',
      })
      .select()
      .single();

    if (analysisError) {
      console.error('[Shopify Insights] Failed to create analysis record:', analysisError);
      throw new Error(`Failed to create analysis: ${analysisError.message}`);
    }

    console.log('[Shopify Insights] Analysis record created:', analysisRecord.id);

    // 2. Generate insights with AI
    console.log('[Shopify Insights] Generating AI insights...');
    const prompt = getShopifyInsightsPrompt(analysisData);

    const aiResponse = await llmService.execute<any[]>({
      prompt,
      provider: 'claude', // Use Claude for best results
      maxTokens: 8000,
      temperature: 0.7,
    });

    if (!aiResponse.success || !aiResponse.data) {
      console.error('[Shopify Insights] AI generation failed:', aiResponse.error);

      // Update analysis status to failed
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error_message: `AI insight generation failed: ${aiResponse.error}`,
        })
        .eq('id', analysisRecord.id);

      throw new Error(`AI generation failed: ${aiResponse.error}`);
    }

    const rawInsights = aiResponse.data;
    console.log(`[Shopify Insights] AI generated ${rawInsights.length} insights`);

    // 3. Transform and validate insights
    const insightsToStore = rawInsights.map((insight, index) => {
      // Generate unique insight ID
      const insightId = generateInsightId('SHOP');

      return {
        // Links
        analysis_id: analysisRecord.id,
        workspace_id: workspaceId,
        insight_id: insightId,

        // Type & source
        research_type: 'shopify_order_analysis' as const,
        source_type: 'automated' as const,

        // Core content (REQUIRED)
        title: insight.title?.substring(0, 100) || `Insight ${index + 1}`,
        statement: insight.statement || 'No statement provided',

        // Business context (REQUIRED)
        growth_pillar: validateGrowthPillar(insight.growth_pillar),
        confidence_level: validateConfidenceLevel(insight.confidence_level),
        priority: validatePriority(insight.priority),

        // Optional context
        customer_segment: insight.customer_segment || null,
        journey_stage: validateJourneyStage(insight.journey_stage),
        page_location: insight.page_location || null,
        device_type: validateDeviceType(insight.device_type),

        // Evidence & categorization
        evidence: insight.evidence || null,
        sources: {
          primary: {
            type: 'shopify_order_analysis',
            id: analysisRecord.id,
            description: 'Shopify order analysis data',
          },
        },
        friction_type: validateFrictionType(insight.friction_type),
        psychology_principle: validatePsychologyPrinciple(insight.psychology_principle),
        affected_kpis: Array.isArray(insight.affected_kpis) ? insight.affected_kpis : [],
        tags: Array.isArray(insight.tags) ? insight.tags : [],

        // Actions
        suggested_actions: insight.suggested_actions || null,

        // Status
        status: 'draft',
        validation_status: 'untested',
      };
    });

    // 4. Store insights in database
    console.log(`[Shopify Insights] Storing ${insightsToStore.length} insights...`);

    const { data: storedInsights, error: insightError } = await supabase
      .from('insights')
      .insert(insightsToStore)
      .select();

    if (insightError) {
      console.error('[Shopify Insights] Failed to store insights:', insightError);
      throw new Error(`Failed to store insights: ${insightError.message}`);
    }

    // 5. Update analysis record with insight count
    await supabase
      .from('analyses')
      .update({ insights_count: storedInsights.length })
      .eq('id', analysisRecord.id);

    console.log(`[Shopify Insights] Successfully generated ${storedInsights.length} insights`);

    return {
      analysisId: analysisRecord.id,
      insights: storedInsights as Insight[],
      insightCount: storedInsights.length,
      summary: analysisRecord.summary,
    };
  } catch (error) {
    console.error('[Shopify Insights] Generation error:', error);
    throw error;
  }
}

/**
 * Generate unique insight ID
 * Format: INS-{TYPE}-{TIMESTAMP}-{RANDOM}
 */
function generateInsightId(type: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 7);
  return `INS-${type}-${timestamp}-${random}`;
}

/**
 * Validation functions to ensure enum values are correct
 * Falls back to safe defaults if invalid
 */

function validateGrowthPillar(value: any): 'conversion' | 'aov' | 'frequency' | 'retention' | 'acquisition' {
  const valid = ['conversion', 'aov', 'frequency', 'retention', 'acquisition'];
  if (valid.includes(value)) return value;
  console.warn(`[Shopify Insights] Invalid growth_pillar: ${value}, defaulting to 'aov'`);
  return 'aov'; // Default for Shopify analysis
}

function validateConfidenceLevel(value: any): 'high' | 'medium' | 'low' {
  const valid = ['high', 'medium', 'low'];
  if (valid.includes(value)) return value;
  console.warn(`[Shopify Insights] Invalid confidence_level: ${value}, defaulting to 'medium'`);
  return 'medium';
}

function validatePriority(value: any): 'critical' | 'high' | 'medium' | 'low' {
  const valid = ['critical', 'high', 'medium', 'low'];
  if (valid.includes(value)) return value;
  console.warn(`[Shopify Insights] Invalid priority: ${value}, defaulting to 'medium'`);
  return 'medium';
}

function validateJourneyStage(value: any): 'awareness' | 'consideration' | 'decision' | 'post_purchase' | null {
  const valid = ['awareness', 'consideration', 'decision', 'post_purchase'];
  if (value === null || value === undefined) return null;
  if (valid.includes(value)) return value;
  console.warn(`[Shopify Insights] Invalid journey_stage: ${value}, setting to null`);
  return null;
}

function validateDeviceType(value: any): 'mobile' | 'desktop' | 'tablet' | 'all' | null {
  const valid = ['mobile', 'desktop', 'tablet', 'all'];
  if (value === null || value === undefined) return null;
  if (valid.includes(value)) return value;
  console.warn(`[Shopify Insights] Invalid device_type: ${value}, setting to null`);
  return null;
}

function validateFrictionType(
  value: any
): 'usability' | 'trust' | 'value_perception' | 'information_gap' | 'cognitive_load' | null {
  const valid = ['usability', 'trust', 'value_perception', 'information_gap', 'cognitive_load'];
  if (value === null || value === undefined) return null;
  if (valid.includes(value)) return value;
  console.warn(`[Shopify Insights] Invalid friction_type: ${value}, setting to null`);
  return null;
}

function validatePsychologyPrinciple(
  value: any
): 'loss_aversion' | 'social_proof' | 'scarcity' | 'authority' | 'anchoring' | null {
  const valid = ['loss_aversion', 'social_proof', 'scarcity', 'authority', 'anchoring'];
  if (value === null || value === undefined) return null;
  if (valid.includes(value)) return value;
  console.warn(`[Shopify Insights] Invalid psychology_principle: ${value}, setting to null`);
  return null;
}
