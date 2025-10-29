import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { llmService } from '@/lib/services/ai/llm-service';
import { buildThemeGenerationPrompt } from '@/lib/services/ai/prompts/theme-generation-prompts';
import type { Insight, Theme } from '@/lib/types/insights.types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, insightIds, context } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    // Verify workspace access
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 404 });
    }

    // Fetch insights to use for theme generation
    let insights: Insight[] = [];

    if (insightIds && insightIds.length > 0) {
      // Use specific insights if provided
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('insight_id', insightIds);

      if (error) {
        console.error('Error fetching specific insights:', error);
        return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
      }

      insights = data || [];
    } else {
      // Otherwise, fetch all insights for the workspace, prioritizing high-value ones
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('status', ['draft', 'validated'])
        .order('priority', { ascending: false })
        .order('confidence_level', { ascending: false })
        .limit(50); // Limit to prevent overwhelming the AI

      if (error) {
        console.error('Error fetching insights:', error);
        return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
      }

      insights = data || [];
    }

    if (insights.length === 0) {
      return NextResponse.json({
        error: 'No insights found. Please create some insights first.'
      }, { status: 400 });
    }

    console.log(`Generating themes from ${insights.length} insights for workspace ${workspaceId}`);

    // Build the AI prompt
    const prompt = buildThemeGenerationPrompt({
      workspaceId,
      insights,
      context,
    });

    // Call LLM service to generate themes
    console.log('Calling LLM service with Claude...');
    const llmResponse = await llmService.execute({
      prompt,
      provider: 'claude',
      temperature: 0.7,
      maxTokens: 16000, // Increased to handle larger responses with multiple themes
    });

    console.log('LLM Response:', {
      success: llmResponse.success,
      hasData: !!llmResponse.data,
      dataType: typeof llmResponse.data,
      isArray: Array.isArray(llmResponse.data),
      error: llmResponse.error,
      tokensUsed: llmResponse.metadata.tokensUsed,
      cost: llmResponse.metadata.estimatedCost,
    });

    if (!llmResponse.success) {
      const errorMsg = llmResponse.error || 'LLM service returned unsuccessful response';
      console.error('LLM service failed:', errorMsg);
      return NextResponse.json({
        error: errorMsg,
        details: 'The AI service encountered an error. Please try again.'
      }, { status: 500 });
    }

    if (!llmResponse.data) {
      console.error('LLM service returned no data - likely a JSON parsing issue');
      return NextResponse.json({
        error: 'No data received from AI',
        details: 'The AI response could not be parsed. This might be a temporary issue.'
      }, { status: 500 });
    }

    console.log('AI Response received, processing themes...');

    // The LLM service already parses JSON for us
    let generatedThemes: any[];
    try {
      const parsed = llmResponse.data;

      // Handle various response formats (defensive programming)
      if (Array.isArray(parsed)) {
        generatedThemes = parsed;
      } else if (parsed.themes && Array.isArray(parsed.themes)) {
        generatedThemes = parsed.themes;
      } else if (typeof parsed === 'object') {
        // If AI returned single object, wrap it
        generatedThemes = [parsed];
      } else {
        throw new Error('Unexpected response format');
      }

      console.log(`Parsed ${generatedThemes.length} themes from AI response`);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json({
        error: 'Failed to parse AI response',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Validate and insert themes into database
    const createdThemes: Theme[] = [];

    for (const themeData of generatedThemes) {
      try {
        // Prepare theme object for database
        const themeToInsert = {
          workspace_id: workspaceId,
          theme_id: themeData.theme_id,
          title: themeData.title,
          theme_statement: themeData.theme_statement,
          priority: themeData.priority,
          growth_pillar: themeData.growth_pillar,
          status: 'active' as const,
          connected_insights: themeData.connected_insights || [],
          affected_pages: themeData.affected_pages || [],
          current_performance: themeData.current_performance || null,
          business_impact: themeData.business_impact || null,
          recommended_actions: themeData.recommended_actions || [],
          opportunity_calculation: themeData.opportunity_calculation || null,
        };

        // Insert into database
        const { data: insertedTheme, error: insertError } = await supabase
          .from('themes')
          .insert(themeToInsert)
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting theme:', insertError);
          console.error('Theme data:', themeToInsert);
          continue; // Skip this theme and continue with others
        }

        if (insertedTheme) {
          createdThemes.push(insertedTheme);
        }
      } catch (themeError) {
        console.error('Error processing theme:', themeError);
        continue;
      }
    }

    if (createdThemes.length === 0) {
      return NextResponse.json({
        error: 'Failed to create themes in database',
        generatedCount: generatedThemes.length
      }, { status: 500 });
    }

    console.log(`Successfully created ${createdThemes.length} themes`);

    return NextResponse.json({
      success: true,
      themes: createdThemes,
      count: createdThemes.length,
    });

  } catch (error) {
    console.error('Error in theme generation:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
