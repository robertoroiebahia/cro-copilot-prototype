import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createClient } from '@/utils/supabase/server';
import { parseCSV, validateCSVForResearchType, extractTextForAnalysis } from '@/lib/services/data-processing/csv-parser';
import { getCSVAnalysisPrompt } from '@/lib/services/ai/prompts/csv-analysis-prompts';
import { llmService } from '@/lib/services/ai/llm-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large CSVs

type ResearchType = 'survey_analysis' | 'onsite_poll' | 'review_mining';

const RESEARCH_TYPE_LABELS: Record<ResearchType, string> = {
  survey_analysis: 'Survey Analysis',
  onsite_poll: 'Onsite Poll Analysis',
  review_mining: 'Review Mining',
};

/**
 * POST /api/analyze-csv
 *
 * Universal CSV analysis endpoint for all CSV-based research types
 *
 * Body:
 * {
 *   workspaceId: string,
 *   researchType: 'survey_analysis' | 'onsite_poll' | 'review_mining',
 *   csvData: string (CSV text),
 *   fileName?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createClient();

    // Parse request body
    const body = await request.json();
    const { workspaceId, researchType, csvData, fileName } = body;

    // Validate inputs
    if (!workspaceId || !researchType || !csvData) {
      return NextResponse.json(
        { error: 'workspaceId, researchType, and csvData are required' },
        { status: 400 }
      );
    }

    if (!['survey_analysis', 'onsite_poll', 'review_mining'].includes(researchType)) {
      return NextResponse.json(
        { error: 'Invalid research type' },
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

    // Step 1: Parse CSV
    console.log('Parsing CSV data...');
    const parseResult = parseCSV(csvData);

    if (!parseResult.success || !parseResult.data || !parseResult.headers) {
      return NextResponse.json(
        { error: parseResult.error || 'Failed to parse CSV' },
        { status: 400 }
      );
    }

    const { data, headers, rowCount } = parseResult;

    // Step 2: Validate CSV structure for research type
    console.log('Validating CSV structure...');
    const validation = validateCSVForResearchType(headers, researchType as ResearchType);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error,
          suggestions: validation.suggestions,
        },
        { status: 400 }
      );
    }

    // Step 3: Extract relevant text for analysis
    console.log('Extracting text for analysis...');
    const textEntries = extractTextForAnalysis(data, headers, researchType as ResearchType);

    if (textEntries.length === 0) {
      return NextResponse.json(
        { error: 'No valid text data found in CSV' },
        { status: 400 }
      );
    }

    // Step 4: Create analysis record
    console.log('Creating analysis record...');
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        url: fileName || `${RESEARCH_TYPE_LABELS[researchType as ResearchType]} - ${new Date().toISOString().split('T')[0]}`,
        research_type: researchType,
        metrics: {
          total_rows: rowCount,
          headers: headers,
          sample_size: textEntries.length,
        },
        context: {
          file_name: fileName,
          uploaded_at: new Date().toISOString(),
        },
        summary: {
          type: RESEARCH_TYPE_LABELS[researchType as ResearchType],
          responses: `${rowCount} responses`,
        },
        status: 'completed',
      })
      .select()
      .single();

    if (analysisError || !analysisRecord) {
      console.error('Failed to create analysis:', analysisError);
      return NextResponse.json(
        { error: 'Failed to create analysis record' },
        { status: 500 }
      );
    }

    // Step 5: Generate AI insights
    console.log('Generating AI insights...');
    const prompt = getCSVAnalysisPrompt({
      researchType: researchType as ResearchType,
      dataPreview: textEntries,
      totalRows: rowCount || 0,
      headers,
    });

    const aiResponse = await llmService.execute<any[]>({
      prompt,
      provider: 'claude',
      maxTokens: 8000,
    });

    if (!aiResponse.success || !aiResponse.data) {
      console.error('AI analysis failed:', aiResponse.error);
      return NextResponse.json({
        success: true,
        analysisId: analysisRecord.id,
        insights: [],
        warning: 'Analysis created but AI insight generation failed',
      });
    }

    const rawInsights = aiResponse.data;

    // Step 6: Store insights
    console.log('Storing insights...');
    const storedInsights = [];

    for (const insight of rawInsights) {
      const insightRecord = {
        analysis_id: analysisRecord.id,
        workspace_id: workspaceId,
        insight_id: `INS-${researchType.toUpperCase().substring(0, 3)}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
        research_type: researchType,
        source_type: 'automated' as const,
        source_url: fileName || 'CSV Upload',

        // Core fields
        title: insight.statement.substring(0, 100),
        statement: insight.statement,
        growth_pillar: insight.growth_pillar || 'conversion',
        confidence_level: insight.confidence_level || 'medium',
        priority: insight.priority || 'medium',

        // Evidence
        evidence: insight.evidence || {},
        sources: {
          primary: {
            type: 'csv_upload',
            name: fileName || 'CSV File',
            date: new Date().toISOString(),
          },
        },

        // Context
        customer_segment: insight.customer_segment || null,
        journey_stage: insight.journey_stage || null,
        page_location: [],
        device_type: insight.device_type || null,

        // Categorization
        friction_type: insight.friction_type || null,
        psychology_principle: insight.psychology_principle || null,
        tags: insight.tags || [`#${researchType}`, '#csv_upload'],
        affected_kpis: insight.affected_kpis || [],

        // Actions
        validation_status: 'untested' as const,
        status: 'draft' as const,
      };

      const { error: insightError } = await supabase
        .from('insights')
        .insert(insightRecord);

      if (!insightError) {
        storedInsights.push(insight);
      }
    }

    return NextResponse.json({
      success: true,
      analysisId: analysisRecord.id,
      insights: storedInsights,
      metadata: {
        rowsAnalyzed: rowCount,
        insightsGenerated: storedInsights.length,
        researchType: RESEARCH_TYPE_LABELS[researchType as ResearchType],
      },
    });
  } catch (error) {
    console.error('CSV analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
