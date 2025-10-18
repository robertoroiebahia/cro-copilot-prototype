import Anthropic from '@anthropic-ai/sdk';

/**
 * Section types that can be analyzed
 */
export type SectionType = 'hero' | 'social-proof' | 'cta';

/**
 * Context about the page being analyzed
 */
export interface PageContext {
  url: string;
  metrics?: {
    visitors?: string | number;
    addToCarts?: string | number;
    purchases?: string | number;
    conversionRate?: string | number;
  };
  trafficSource?: string;
  productType?: string;
  pricePoint?: string;
}

/**
 * Result from analyzing a section
 */
export interface SectionAnalysis {
  issue: string;                    // One-sentence problem statement
  explanation: string;               // 2-3 sentences why this hurts conversions
  currentCopy: string;              // Exact text visible in screenshot
  suggestedCopy: string;            // Improved alternative
  expectedImpact: string;           // Percentage range like "8-12%"
  confidence: 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  principle: string;                // CRO principle being applied
}

/**
 * Analyzes a specific section of a landing page using Claude Vision
 *
 * @param screenshot - Base64-encoded image of the section
 * @param sectionType - Type of section being analyzed
 * @param pageContext - Context about the page and business
 * @returns Structured analysis of the section
 *
 * @example
 * ```typescript
 * const analysis = await analyzeSection(
 *   heroScreenshot,
 *   'hero',
 *   {
 *     url: 'https://example.com',
 *     metrics: { conversionRate: '2.5%' },
 *     trafficSource: 'paid_social'
 *   }
 * );
 * console.log(analysis.issue);
 * console.log(analysis.suggestedCopy);
 * ```
 */
export async function analyzeSection(
  screenshot: string,
  sectionType: SectionType,
  pageContext: PageContext
): Promise<SectionAnalysis> {
  // Step 1: Validate inputs
  if (!screenshot || screenshot.length === 0) {
    throw new Error('Screenshot is required');
  }

  if (!pageContext.url) {
    throw new Error('Page URL is required in context');
  }

  // Step 2: Initialize Anthropic client
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const anthropic = new Anthropic({
    apiKey,
  });

  // Step 3: Build context-aware prompt based on section type
  const sectionPrompts: Record<SectionType, string> = {
    hero: `You are analyzing the HERO SECTION (the first thing visitors see).

Focus on:
- Value proposition clarity: Is it immediately clear what this product/service does?
- Benefit vs feature balance: Are benefits emphasized over features?
- Headline strength: Does it grab attention and communicate value?
- Visual hierarchy: Is the most important info prominent?
- CTA visibility: Is the primary action clear and accessible?

Common issues:
- Vague headlines that don't communicate unique value
- Feature-focused copy instead of benefit-focused
- Weak or generic CTAs
- Unclear value proposition
- Poor visual hierarchy`,

    'social-proof': `You are analyzing the SOCIAL PROOF section (reviews, testimonials, ratings).

Focus on:
- Specificity: Are testimonials specific and credible?
- Relevance: Do they address common objections or desires?
- Authenticity: Do they feel real (names, photos, details)?
- Placement: Is social proof visible and prominent?
- Quantity signals: Are numbers of reviews/customers shown?

Common issues:
- Generic testimonials that could apply to any product
- Lack of specifics (vague praise without concrete outcomes)
- Missing authenticity signals (no names, photos, or context)
- Hidden or buried social proof
- No quantitative metrics (star ratings, number of reviews)`,

    cta: `You are analyzing the PRIMARY CTA BUTTON (call-to-action).

Focus on:
- Copy clarity: Does it clearly communicate the next step?
- Value communication: Does it emphasize benefit over action?
- Urgency/motivation: Is there a reason to act now?
- Friction reduction: Does it address concerns (e.g., "Free trial" vs "Buy now")?
- Visual prominence: Is it impossible to miss?

Common issues:
- Generic CTAs like "Submit" or "Click Here"
- No benefit communication in button copy
- Friction-inducing words ("Buy", "Purchase" without context)
- Poor contrast or visibility
- Missing urgency or motivation to act`,
  };

  // Step 4: Build the analysis prompt
  const systemPrompt = `You are an expert conversion rate optimization (CRO) analyst specializing in e-commerce and DTC brands. You analyze landing page sections and provide specific, actionable recommendations based on proven conversion principles.

Your analysis must be:
1. SPECIFIC - Reference actual elements you see in the screenshot
2. EVIDENCE-BASED - Explain WHY something hurts conversions, not just WHAT is wrong
3. ACTIONABLE - Provide concrete copy alternatives, not vague suggestions
4. REALISTIC - Give honest impact estimates based on the severity of issues
5. PRINCIPLED - Ground recommendations in established CRO principles

Response format: Return ONLY valid JSON with this exact structure:
{
  "issue": "One clear sentence describing the main problem",
  "explanation": "2-3 sentences explaining why this specific issue hurts conversions, referencing visitor psychology or proven CRO principles",
  "currentCopy": "The exact text you see in this section (word-for-word)",
  "suggestedCopy": "Your improved alternative copy",
  "expectedImpact": "Realistic percentage range (e.g., '5-8%', '10-15%', '15-25%')",
  "confidence": "High | Medium | Low",
  "effort": "Low | Medium | High",
  "principle": "The CRO principle applied (e.g., 'Clarity over cleverness', 'Benefit over features', 'Social proof specificity', 'Friction reduction')"
}`;

  const userPrompt = `${sectionPrompts[sectionType]}

CONTEXT ABOUT THIS PAGE:
- URL: ${pageContext.url}
${pageContext.metrics?.conversionRate ? `- Current conversion rate: ${pageContext.metrics.conversionRate}` : ''}
${pageContext.metrics?.visitors ? `- Monthly visitors: ${pageContext.metrics.visitors}` : ''}
${pageContext.trafficSource ? `- Traffic source: ${pageContext.trafficSource}` : ''}
${pageContext.productType ? `- Product type: ${pageContext.productType}` : ''}
${pageContext.pricePoint ? `- Price point: ${pageContext.pricePoint}` : ''}

TASK:
Analyze this ${sectionType} section screenshot and identify the MOST IMPACTFUL issue. Return your analysis as valid JSON following the exact structure provided in the system prompt.

Guidelines:
- Be brutally honest - if something is mediocre, say so
- Focus on the #1 highest-impact issue you can find
- Quote the actual copy you see (word-for-word in currentCopy field)
- Make your suggestedCopy significantly better, not just slightly different
- Impact estimates should reflect the severity: major issues = 15-25%, moderate = 8-15%, minor = 3-8%
- Set confidence based on how obvious/proven the fix is
- Effort should reflect implementation complexity (changing copy = Low, redesign = High)`;

  try {
    // Step 5: Call Claude API with vision
    console.log(`🔍 Analyzing ${sectionType} section with Claude Vision...`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshot,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      system: systemPrompt,
    });

    // Step 6: Extract and parse the response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    let responseText = textContent.text.trim();

    // Remove markdown code fences if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Step 7: Parse JSON response
    let analysis: SectionAnalysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error(`Claude returned invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Step 8: Validate required fields
    const requiredFields: (keyof SectionAnalysis)[] = [
      'issue',
      'explanation',
      'currentCopy',
      'suggestedCopy',
      'expectedImpact',
      'confidence',
      'effort',
      'principle',
    ];

    for (const field of requiredFields) {
      if (!analysis[field]) {
        throw new Error(`Missing required field in Claude response: ${field}`);
      }
    }

    // Validate enum values
    if (!['High', 'Medium', 'Low'].includes(analysis.confidence)) {
      throw new Error(`Invalid confidence value: ${analysis.confidence}`);
    }

    if (!['Low', 'Medium', 'High'].includes(analysis.effort)) {
      throw new Error(`Invalid effort value: ${analysis.effort}`);
    }

    console.log(`✅ ${sectionType} analysis complete`);
    console.log(`   Issue: ${analysis.issue}`);
    console.log(`   Impact: ${analysis.expectedImpact}`);
    console.log(`   Confidence: ${analysis.confidence}`);

    return analysis;

  } catch (error: any) {
    // Step 9: Handle errors gracefully
    console.error(`❌ Failed to analyze ${sectionType} section:`, error.message);

    // Check for specific API errors
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key. Please check ANTHROPIC_API_KEY environment variable.');
    }

    if (error.status === 429) {
      throw new Error('Anthropic API rate limit exceeded. Please try again later.');
    }

    if (error.status === 500 || error.status === 529) {
      throw new Error('Anthropic API is temporarily unavailable. Please try again later.');
    }

    // Re-throw with more context
    throw new Error(`Failed to analyze ${sectionType} section: ${error.message}`);
  }
}

/**
 * Batch analyze multiple sections in parallel
 *
 * @param sections - Array of sections to analyze
 * @param pageContext - Shared context about the page
 * @returns Array of analyses in the same order as input
 *
 * @example
 * ```typescript
 * const analyses = await analyzeSections([
 *   { screenshot: heroBase64, type: 'hero' },
 *   { screenshot: ctaBase64, type: 'cta' }
 * ], pageContext);
 * ```
 */
export async function analyzeSections(
  sections: Array<{ screenshot: string; type: SectionType }>,
  pageContext: PageContext
): Promise<SectionAnalysis[]> {
  console.log(`📊 Analyzing ${sections.length} sections in parallel...`);

  const results = await Promise.allSettled(
    sections.map((section) => analyzeSection(section.screenshot, section.type, pageContext))
  );

  const analyses: SectionAnalysis[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      analyses.push(result.value);
    } else {
      const sectionType = sections[index].type;
      errors.push(`${sectionType}: ${result.reason.message}`);
      console.error(`❌ Failed to analyze ${sectionType}:`, result.reason.message);
    }
  });

  if (analyses.length === 0) {
    throw new Error(`All section analyses failed:\n${errors.join('\n')}`);
  }

  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} section(s) failed to analyze`);
  }

  return analyses;
}
