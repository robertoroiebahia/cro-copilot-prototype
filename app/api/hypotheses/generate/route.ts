import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';
import { getHypothesisGenerationPrompt } from '@/lib/services/ai/prompts/hypothesis-generation-prompts';
import { llmService } from '@/lib/services/ai/llm-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 180; // 3 minutes

/**
 * POST /api/hypotheses/generate
 *
 * Generate hypotheses from themes, insights, and experiments using AI
 *
 * Body:
 * {
 *   workspaceId: string,
 *   themeIds?: string[], // Optional: specific themes to use
 *   insightIds?: string[], // Optional: specific insights to use
 *   experimentIds?: string[], // Optional: specific experiments to use
 *   context?: {
 *     industry?: string,
 *     targetAudience?: string,
 *     currentConversionRate?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createClient();

    // Parse request body
    const body = await request.json();
    const { workspaceId, themeIds, insightIds, experimentIds, context } = body;

    // Validate inputs
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify workspace ownership
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, user_id')
      .eq('id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    // Step 1: Fetch themes (if requested)
    let themes: any[] = [];
    if (!insightIds && !experimentIds) {
      // If no specific insights or experiments provided, fetch themes
      console.log('Fetching themes...');
      let themesQuery = supabase
        .from('themes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      // If specific theme IDs provided, filter by them
      if (themeIds && themeIds.length > 0) {
        themesQuery = themesQuery.in('theme_id', themeIds);
      } else {
        // Otherwise, get most recent/high-priority themes
        themesQuery = themesQuery.limit(10);
      }

      const { data: themesData, error: themesError } = await themesQuery;

      if (themesError || !themesData || themesData.length === 0) {
        return NextResponse.json(
          { error: 'No themes found. Please create themes first.' },
          { status: 400 }
        );
      }
      themes = themesData;
    } else if (themeIds && themeIds.length > 0) {
      // Also fetch themes if specific IDs were provided
      console.log('Fetching specific themes...');
      const { data: themesData } = await supabase
        .from('themes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('theme_id', themeIds);
      themes = themesData || [];
    }

    // Step 2: Fetch insights
    console.log('Fetching insights...');
    let allInsights: any[] = [];

    if (insightIds && insightIds.length > 0) {
      // Fetch specific insights if provided
      const { data: specificInsights } = await supabase
        .from('insights')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('insight_id', insightIds);
      allInsights = specificInsights || [];
    } else {
      // Collect all insight IDs from themes
      const themeInsightIds = new Set<string>();
      themes.forEach(theme => {
        const connectedInsights = theme.connected_insights || [];
        connectedInsights.forEach((ci: any) => {
          if (ci.insightId) {
            themeInsightIds.add(ci.insightId);
          }
        });
      });

      // Fetch insights from themes or recent workspace insights
      if (themeInsightIds.size > 0) {
        const { data: themeInsights } = await supabase
          .from('insights')
          .select('*')
          .eq('workspace_id', workspaceId)
          .in('insight_id', Array.from(themeInsightIds));
        allInsights = themeInsights || [];
      } else {
        // Fall back to recent insights
        const { data: workspaceInsights } = await supabase
          .from('insights')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(50);
        allInsights = workspaceInsights || [];
      }
    }

    // Step 3: Fetch experiments (if requested)
    let experiments: any[] = [];
    if (experimentIds && experimentIds.length > 0) {
      console.log('Fetching specific experiments...');
      const { data: experimentsData } = await supabase
        .from('experiments')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('experiment_id', experimentIds);
      experiments = experimentsData || [];
    }

    // Validate we have at least some data
    if (themes.length === 0 && allInsights.length === 0 && experiments.length === 0) {
      return NextResponse.json(
        { error: 'No data found. Please select themes, insights, or experiments.' },
        { status: 400 }
      );
    }

    // Step 4: Generate hypotheses using AI
    console.log('Generating hypotheses with AI...');
    const prompt = getHypothesisGenerationPrompt({
      themes,
      insights: allInsights,
      experiments,
      context,
    });

    const aiResponse = await llmService.execute<any[]>({
      prompt,
      provider: 'claude',
      maxTokens: 12000, // Need more tokens for multiple hypotheses
      temperature: 0.7,
    });

    if (!aiResponse.success || !aiResponse.data) {
      console.error('AI hypothesis generation failed:', aiResponse.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate hypotheses. Please try again.',
      }, { status: 500 });
    }

    let rawHypotheses = aiResponse.data;

    // CRITICAL DEBUG: Log what AI actually returned
    console.log('🔍 AI Response Type:', typeof rawHypotheses);
    console.log('🔍 Is Array?:', Array.isArray(rawHypotheses));
    console.log('🔍 Raw Data Sample:', JSON.stringify(rawHypotheses).substring(0, 500));

    // FIX: Ensure we always have an array
    if (!Array.isArray(rawHypotheses)) {
      console.log('⚠️  AI returned single object instead of array - wrapping it');
      rawHypotheses = [rawHypotheses];
    }

    // FIX: If AI nested the array in a "hypotheses" property, extract it
    if (rawHypotheses.length === 1 && rawHypotheses[0].hypotheses && Array.isArray(rawHypotheses[0].hypotheses)) {
      console.log('⚠️  AI nested hypotheses in wrapper object - extracting array');
      rawHypotheses = rawHypotheses[0].hypotheses;
    }

    console.log(`✅ Processing ${rawHypotheses.length} hypotheses`);

    // Step 5: Store hypotheses in database
    console.log('Storing hypotheses...');
    const storedHypotheses = [];

    for (const hyp of rawHypotheses) {
      // Calculate PXL score
      // PXL = (Potential Value × Confidence × Ease) / max possible score
      // Normalized to 0-100 scale
      const potentialValueScore = hyp.potential_value === 'High' ? 10 : hyp.potential_value === 'Medium' ? 6 : 3;
      const pxlScore = ((potentialValueScore * (hyp.confidence_score || 5) * (hyp.ease_score || 5)) / 1000) * 100;

      const hypothesisRecord = {
        workspace_id: workspaceId,
        hypothesis_id: `HYP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
        theme_id: hyp.theme_id ? themes.find(t => t.theme_id === hyp.theme_id)?.id : null,

        // Core fields
        statement: hyp.statement,
        based_on_insights: hyp.based_on_insight_ids?.map((id: string) => ({ insightId: id, weight: 1 / hyp.based_on_insight_ids.length })) || [],
        expected_impact: hyp.expected_impact || {},

        // PXL Framework fields
        research_backed: hyp.research_backed ?? true,
        research_notes: hyp.research_notes || null,
        effort_design: hyp.effort_design || null,
        effort_dev: hyp.effort_dev || null,
        effort_copy: hyp.effort_copy || null,
        above_fold: hyp.above_fold ?? false,
        page_location: hyp.page_location || null,
        element_location: hyp.element_location || null,
        psychology_principle: hyp.psychology_principle || null,
        psychology_notes: hyp.psychology_notes || null,

        // Target details
        target_url: hyp.target_url || null,
        target_pages: hyp.target_pages || [],
        target_audiences: hyp.target_audiences || [],

        // KPIs
        primary_kpi: hyp.primary_kpi || null,
        secondary_kpis: hyp.secondary_kpis || [],
        success_criteria: hyp.success_criteria || {},

        // Scores
        confidence_score: hyp.confidence_score || null,
        potential_value: hyp.potential_value || 'Medium',
        ease_score: hyp.ease_score || null,
        pxl_score: pxlScore,

        // Status
        status: hyp.status || 'draft',
        priority: hyp.priority || 'P1',
      };

      const { data: inserted, error: insertError } = await supabase
        .from('hypotheses')
        .insert(hypothesisRecord)
        .select()
        .single();

      if (!insertError && inserted) {
        storedHypotheses.push(inserted);
      } else {
        console.error('Failed to insert hypothesis:', insertError);
      }
    }

    return NextResponse.json({
      success: true,
      hypotheses: storedHypotheses,
      metadata: {
        themesAnalyzed: themes.length,
        insightsAnalyzed: allInsights.length,
        experimentsAnalyzed: experiments.length,
        hypothesesGenerated: storedHypotheses.length,
      },
    });
  } catch (error) {
    console.error('Hypothesis generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
