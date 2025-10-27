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

    let rawInsights = aiResponse.data;

    // CRITICAL DEBUG: Log what AI actually returned
    console.log('=================================');
    console.log('🔍 AI RESPONSE DEBUG');
    console.log('=================================');
    console.log('Type:', typeof rawInsights);
    console.log('Is Array?:', Array.isArray(rawInsights));
    console.log('Constructor:', rawInsights?.constructor?.name);
    console.log('Length (if array):', Array.isArray(rawInsights) ? rawInsights.length : 'N/A');
    console.log('Keys (if object):', typeof rawInsights === 'object' && rawInsights !== null ? Object.keys(rawInsights).slice(0, 10) : 'N/A');
    console.log('Full JSON (first 1000 chars):', JSON.stringify(rawInsights, null, 2).substring(0, 1000));
    console.log('=================================');

    // FIX: Ensure we always have an array
    // If AI returned a single object instead of an array, wrap it
    if (!Array.isArray(rawInsights)) {
      console.log('⚠️  AI returned single object instead of array - wrapping it');
      rawInsights = [rawInsights];
    }

    // FIX: If AI nested the array in a "insights" property, extract it
    if (rawInsights.length === 1 && rawInsights[0].insights && Array.isArray(rawInsights[0].insights)) {
      console.log('⚠️  AI nested insights in wrapper object - extracting array');
      rawInsights = rawInsights[0].insights;
    }

    // FIX: Check for other common wrapper patterns
    if (rawInsights.length === 1 && typeof rawInsights[0] === 'object') {
      const firstItem = rawInsights[0];
      // Check for various wrapper patterns
      if (firstItem.data && Array.isArray(firstItem.data)) {
        console.log('⚠️  Found insights in "data" wrapper - extracting');
        rawInsights = firstItem.data;
      } else if (firstItem.results && Array.isArray(firstItem.results)) {
        console.log('⚠️  Found insights in "results" wrapper - extracting');
        rawInsights = firstItem.results;
      } else if (firstItem.items && Array.isArray(firstItem.items)) {
        console.log('⚠️  Found insights in "items" wrapper - extracting');
        rawInsights = firstItem.items;
      }
    }

    console.log(`✅ Final processing count: ${rawInsights.length} insights`);
    console.log('First insight preview:', rawInsights[0] ? JSON.stringify(rawInsights[0]).substring(0, 200) : 'No insights');

    // Step 6: Store insights
    console.log('Storing insights...');
    const storedInsights = [];

    for (let i = 0; i < rawInsights.length; i++) {
      const insight = rawInsights[i];
      console.log(`Processing insight ${i + 1}/${rawInsights.length}...`);

      // Helper function to sanitize AI responses - convert "N/A" to null
      const sanitizeValue = (value: any) => {
        if (value === 'N/A' || value === 'null' || value === '' || value === undefined) {
          return null;
        }
        return value;
      };

      const insightRecord = {
        analysis_id: analysisRecord.id,
        workspace_id: workspaceId,
        insight_id: `INS-${researchType.toUpperCase().substring(0, 3)}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
        research_type: researchType,
        source_type: 'automated' as const,
        source_url: fileName || 'CSV Upload',

        // Core fields
        title: insight.title || insight.statement?.substring(0, 100) || 'Untitled Insight',
        statement: insight.statement || '',
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

        // Context - sanitize "N/A" to null
        customer_segment: sanitizeValue(insight.customer_segment),
        journey_stage: sanitizeValue(insight.journey_stage),
        page_location: [],
        device_type: sanitizeValue(insight.device_type),

        // Categorization - sanitize "N/A" to null
        friction_type: sanitizeValue(insight.friction_type),
        psychology_principle: sanitizeValue(insight.psychology_principle),
        tags: insight.tags || [`#${researchType}`, '#csv_upload'],
        affected_kpis: insight.affected_kpis || [],

        // Actions
        suggested_actions: sanitizeValue(insight.suggested_actions),
        validation_status: 'untested' as const,
        status: 'draft' as const,
      };

      const { data, error: insightError } = await supabase
        .from('insights')
        .insert(insightRecord)
        .select();

      if (insightError) {
        console.error(`❌ Failed to insert insight ${i + 1}:`, insightError);
        console.error('Insight data:', JSON.stringify(insight).substring(0, 300));
      } else {
        console.log(`✅ Successfully inserted insight ${i + 1}`);
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
