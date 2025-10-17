import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { ScreenshotService } from '../../../lib/screenshot-service';
import {
  analyzeAboveFold,
  VisionAnalysisError,
  VisionAnalysisResult,
} from '../../../lib/vision-analysis';
import { createClient } from '@/utils/supabase/server';
import type { InsertAnalysis } from '@/lib/types/database.types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const screenshotService = new ScreenshotService();

async function analyzePage(url: string) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(data);

    return {
      h1: $('h1').first().text().trim() || 'Not found',
      subheadline: $('h2').first().text().trim() || '',
      headlines: $('h2, h3')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(h => h.length > 0)
        .slice(0, 10),
      ctas: $('button, a.btn, [class*="button"], [class*="cta"], [class*="add-to-cart"]')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(cta => cta.length > 0 && cta.length < 50)
        .slice(0, 15),
      formFields: $('input, select, textarea').length,
      hasReviews: $('[class*="review"], [class*="rating"], [class*="stars"], [class*="testimonial"]').length > 0,
      reviewCount: $('[class*="review"], [class*="testimonial"]').length,
      hasTrustBadges: $('[class*="trust"], [class*="secure"], [class*="guarantee"], [class*="badge"], [class*="certified"]').length > 0,
      hasUrgency: /(limited|hurry|now|today|sale|ending|last chance|only.*left|selling fast)/i.test($.text()),
      hasSocialProof: /(customer|bought|purchased|rated|verified|reviews|testimonial|people love|bestseller)/i.test($.text()),
      hasMoneyBackGuarantee: /(money.back|satisfaction guaranteed|100% guarantee|risk.free|refund)/i.test($.text()),
      hasFreeShipping: /(free shipping|free delivery|ships free)/i.test($.text()),
      fullText: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000),
      meta: {
        title: $('title').text(),
        description: $('meta[name="description"]').attr('content') || '',
      },
    };
  } catch (error) {
    console.error('Page analysis error:', error);
    throw new Error('Failed to fetch page content');
  }
}

function buildVisionNarrative(
  analysis: VisionAnalysisResult | null,
  error: string | null,
): string {
  if (!analysis) {
    return `Vision analysis unavailable: ${error || 'No screenshots captured.'}`;
  }

  if (analysis.status === 'unreadable') {
    return `Vision model could not interpret the screenshots (confidence ${analysis.confidence}). Please verify captures.`;
  }

  const lines: string[] = [];

  lines.push(
    `Confidence: ${analysis.confidence}. Primary hero headline: "${analysis.hero.headline || 'Not detected'}".`,
  );

  if (analysis.hero.subheadline) {
    lines.push(`Hero subheadline: "${analysis.hero.subheadline}".`);
  }

  if (analysis.hero.cta.text) {
    const styleClues = analysis.hero.cta.styleClues.length
      ? ` (style clues: ${analysis.hero.cta.styleClues.join(', ')})`
      : '';
    lines.push(`Primary CTA: "${analysis.hero.cta.text}"${styleClues}.`);
  } else {
    lines.push('Primary CTA not confidently detected.');
  }

  if (analysis.ctas.length > 0) {
    const ctaSummary = analysis.ctas
      .map((cta) => `${cta.text || 'CTA'} [${cta.prominence}] @ ${cta.locationHint}`)
      .slice(0, 5)
      .join('; ');
    lines.push(`CTA inventory: ${ctaSummary}.`);
  } else {
    lines.push('No additional CTAs spotted above the fold.');
  }

  if (analysis.trustSignals.length > 0) {
    lines.push(`Trust signals visible: ${analysis.trustSignals.join(', ')}.`);
  } else {
    lines.push('Trust signals not observed above the fold.');
  }

  if (analysis.visualHierarchy.length > 0) {
    lines.push(
      `Visual hierarchy attention order: ${analysis.visualHierarchy.join(' → ')}.`,
    );
  }

  if (analysis.responsiveness.issues.length > 0) {
    lines.push(
      `Responsive issues flagged (${analysis.responsiveness.overallRisk} risk): ${analysis.responsiveness.issues.join(
        '; ',
      )}.`,
    );
  } else {
    lines.push(
      `Responsive risk rated ${analysis.responsiveness.overallRisk} with no specific issues noted.`,
    );
  }

  lines.push(
    `Heavy media detected: ${analysis.performanceSignals.heavyMedia ? 'Yes' : 'No'}. ${
      analysis.performanceSignals.notes || ''
    }`,
  );

  if (analysis.differences.flagged && analysis.differences.notes.length > 0) {
    lines.push(
      `Desktop vs mobile differences: ${analysis.differences.notes.join('; ')}.`,
    );
  } else {
    lines.push('No major desktop vs mobile differences highlighted.');
  }

  if (analysis.cost) {
    lines.push(
      `Model usage: ${analysis.cost.inputTokens} input tokens, ${analysis.cost.outputTokens} output tokens (≈$${analysis.cost.estimatedUsd.toFixed(
        4,
      )}).`,
    );
  }

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const { url, metrics, context } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [pageData, screenshots] = await Promise.all([
      analyzePage(url),
      screenshotService
        .capturePageScreenshots(url)
        .catch((error) => {
          console.error('Screenshot capture error:', error);
          return null;
        }),
    ]);

    let visionAnalysis: VisionAnalysisResult | null = null;
    let visionError: string | null = null;

    if (screenshots) {
      try {
        visionAnalysis = await analyzeAboveFold({
          desktopImageBase64: screenshots.desktop.aboveFold,
          mobileImageBase64: screenshots.mobile.aboveFold,
        });
      } catch (error) {
        if (error instanceof VisionAnalysisError) {
          visionError = error.message;
        } else {
          visionError = 'Vision analysis failed';
        }
        console.error('Vision analysis error:', error);
    }
  } else {
    visionError = 'Screenshot capture unavailable';
  }

  const visionNarrative = buildVisionNarrative(visionAnalysis, visionError);
    
    // Calculate LP metrics
    const lpConversionRate = metrics.visitors && metrics.purchases
      ? ((Number(metrics.purchases) / Number(metrics.visitors)) * 100).toFixed(2)
      : '0';

    const atcRate = metrics.visitors && metrics.addToCarts
      ? ((Number(metrics.addToCarts) / Number(metrics.visitors)) * 100).toFixed(2)
      : '0';

    const systemPrompt = `You are an expert DTC landing page optimizer and conversion copywriter.

Your goal: Analyze landing pages and provide specific, actionable experiments to increase add-to-cart rate and conversions.

### Analysis Framework

1. **Hero Section Analysis**
   - Headline clarity and value prop
   - Subheadline support
   - CTA visibility and copy
   - Visual hierarchy

2. **Message-Market Fit**
   - Does messaging match traffic source expectations?
   - Does it speak to customer awareness level?
   - Emotional vs rational appeal balance

3. **Trust & Urgency**
   - Social proof placement and quality
   - Trust signals (reviews, guarantees, badges)
   - Urgency messaging (authentic vs manipulative)

4. **Conversion Friction**
   - Form complexity
   - Pricing clarity
   - Shipping/returns info
   - Mobile optimization cues

### Your Output Must Be:
- Specific and testable (not "improve headline")
- Prioritized by expected impact
- Include before/after copy examples
- Reference CRO principles (social proof, scarcity, clarity, etc.)
- Focused on TOP OF FUNNEL (getting people to ATC)`;

    const userPrompt = `Analyze this DTC landing page for conversion optimization.

### LANDING PAGE CONTENT

**Meta:**
- Title: "${pageData.meta.title}"
- Description: "${pageData.meta.description}"

**Hero Section:**
- Main Headline: "${pageData.h1}"
- Subheadline: "${pageData.subheadline}"

**All Headlines Found:**
${pageData.headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

**CTAs Found:**
${pageData.ctas.map((cta, i) => `${i + 1}. "${cta}"`).join('\n')}

**Trust Elements:**
- Customer reviews visible: ${pageData.hasReviews ? `Yes (${pageData.reviewCount} found)` : 'No'}
- Trust badges: ${pageData.hasTrustBadges ? 'Yes' : 'No'}
- Money-back guarantee: ${pageData.hasMoneyBackGuarantee ? 'Yes' : 'No'}
- Free shipping mentioned: ${pageData.hasFreeShipping ? 'Yes' : 'No'}
- Urgency messaging: ${pageData.hasUrgency ? 'Yes' : 'No'}
- Social proof: ${pageData.hasSocialProof ? 'Yes' : 'No'}

**Form Complexity:**
- Form fields: ${pageData.formFields}

**Page Content (excerpt):**
${pageData.fullText.slice(0, 3000)}

---

### LANDING PAGE PERFORMANCE

**Metrics:**
- Visitors (30 days): ${metrics.visitors}
- Add to Carts: ${metrics.addToCarts || 'Not provided'}
- Purchases: ${metrics.purchases || 'Not provided'}
- Average Order Value: $${metrics.aov || 'Not provided'}

**Calculated:**
- LP Conversion Rate: ${lpConversionRate}%
- Add-to-Cart Rate: ${atcRate}%

**Context:**
- Traffic Source: ${context.trafficSource}
- Product Type: ${context.productType || 'Not specified'}
- Price Point: ${context.pricePoint || 'Not specified'}

---

### ABOVE-THE-FOLD VISUAL INSIGHTS

${visionNarrative}

---

### YOUR TASK

Provide a deep analysis using the 10× Growth-Hacker Landing-Page Audit Framework in this JSON format:

{
  "summary": {
    "headline": "One decisive sentence on LP effectiveness rooted in both copy and visuals",
    "diagnosticTone": "direct | optimistic | urgent",
    "confidence": "low | medium | high"
  },
  "aboveTheFold": {
    "failsFirstFiveSeconds": true,
    "findings": [
      {
        "element": "Message match",
        "status": "pass | risk | fail",
        "evidence": "Quote or describe the relevant hero element",
        "diagnosticQuestion": "Copy the matching question from the framework",
        "recommendation": "Specific change referencing headline/visual/CTA",
        "abTestIdea": "Name a concrete A/B test with success metric"
      }
    ],
    "headlineTest": {
      "control": "Current hero headline",
      "variant": "Proposed variant tied to traffic intent",
      "hypothesis": "If... then... because..."
    },
    "ctaTest": {
      "control": "Current CTA copy or placement",
      "variant": "Proposed variant",
      "hypothesis": "Focused on clarity or urgency"
    },
    "trustGap": "Fast summary of missing trust cues",
    "speedReadability": "Assessment of load + readability issues",
    "priority": "P0 | P1 | P2"
  },
  "belowTheFold": {
    "sequenceAssessment": "Pain → Dream → Solution → Proof → Offer → CTA evaluation",
    "gaps": [
      {
        "layer": "Problem + agitation",
        "issue": "What is missing or weak",
        "recommendation": "Concrete next step"
      }
    ],
    "proofOpportunities": [
      "Specific testimonial/UGC/visual idea aligned to persona"
    ],
    "ctaPlacementNotes": "Do CTAs reappear? What to fix.",
    "priority": "P0 | P1 | P2"
  },
  "fullPage": {
    "messageHierarchy": "Does each scroll level answer What/Why/Proof/Action?",
    "visualHierarchy": "Benefit → proof → action flow assessment",
    "mobileParity": "Where mobile diverges from desktop hero and sections",
    "dataCapture": "Is there a soft conversion? What to add?",
    "analyticsReadiness": "Events missing or misaligned",
    "riskLevel": "low | medium | high"
  },
  "strategicExtensions": {
    "audienceSegments": [
      "Test idea for adjacent intent cluster with angle"
    ],
    "acquisitionContinuity": [
      "How to align hero line with specific UTM/ad set"
    ],
    "creativeFeedbackLoop": [
      "What the next ad iteration should test based on LP findings"
    ]
  },
  "roadmap": [
    {
      "priority": "P0 | P1 | P2",
      "title": "Name of experiment or fix",
      "impact": "High | Medium | Low",
      "effort": "High | Medium | Low",
      "expectedLift": "X-Y%",
      "owner": "Growth | Creative | Dev | Analytics",
      "notes": "One sentence rationale with hero/proof references"
    }
  ]
}

Rules:
- Every string must be grounded in the supplied landing page content AND the vision insights narrative.
- Reuse the framework terminology verbatim where helpful, but do not copy the illustrative text.
- Keep arrays lean (max 4 items) and prioritize highest-impact findings first.
- If data is missing, use null or empty arrays but keep the keys.
- Bias toward actionable CRO tests rather than vague advice.
`;

    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: systemPrompt,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: userPrompt,
            },
          ],
        },
      ],
      max_output_tokens: 5000,
    });

    const insights = JSON.parse(response.output_text || '{}');

    // Save analysis to database
    const analysisData: InsertAnalysis = {
      user_id: user.id,
      url,
      metrics,
      context,
      summary: insights.summary || {},
      above_the_fold: insights.aboveTheFold || null,
      below_the_fold: insights.belowTheFold || null,
      full_page: insights.fullPage || null,
      strategic_extensions: insights.strategicExtensions || null,
      roadmap: insights.roadmap || null,
      vision_analysis: visionAnalysis ? JSON.parse(JSON.stringify(visionAnalysis)) : null,
      screenshots: screenshots
        ? {
            desktopAboveFold: screenshots.desktop.aboveFold,
            desktopFullPage: screenshots.desktop.fullPage,
            mobileAboveFold: screenshots.mobile.aboveFold,
            mobileFullPage: screenshots.mobile.fullPage,
          }
        : null,
      usage: {
        visionInputTokens: visionAnalysis?.cost?.inputTokens,
        visionOutputTokens: visionAnalysis?.cost?.outputTokens,
        analysisInputTokens: response.usage?.input_tokens ?? 0,
        analysisOutputTokens: response.usage?.output_tokens ?? 0,
        totalTokens:
          (visionAnalysis?.cost?.inputTokens || 0) +
          (visionAnalysis?.cost?.outputTokens || 0) +
          (response.usage?.input_tokens || 0) +
          (response.usage?.output_tokens || 0),
        estimatedCost: (visionAnalysis?.cost?.estimatedUsd || 0),
      },
      status: 'completed',
    };

    const { data: savedAnalysis, error: dbError } = await supabase
      .from('analyses')
      .insert(analysisData)
      .select()
      .single();

    if (dbError) {
      console.error('Database save error:', dbError);
      console.error('Error details:', JSON.stringify(dbError, null, 2));
      // Return error to user if database save fails
      return NextResponse.json(
        {
          error: 'Failed to save analysis to database. Please ensure the database migration has been run.',
          details: dbError.message || 'Unknown database error',
          hint: 'Check SETUP.md for instructions on running the database migration'
        },
        { status: 500 }
      );
    }

    const responseData = {
      ...insights,
      id: savedAnalysis.id, // Include the analysis ID for reference
      pageData: {
        h1: pageData.h1,
        hasReviews: pageData.hasReviews,
        hasTrustBadges: pageData.hasTrustBadges,
        hasMoneyBackGuarantee: pageData.hasMoneyBackGuarantee,
      },
      lpMetrics: {
        conversionRate: lpConversionRate,
        atcRate: atcRate,
      },
      visionAnalysis,
      visionAnalysisError: visionError,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens ?? 0,
            outputTokens: response.usage.output_tokens ?? 0,
          }
        : undefined,
      screenshots: screenshots
        ? {
            capturedAt: screenshots.capturedAt,
            desktop: {
              aboveFold: `data:image/png;base64,${screenshots.desktop.aboveFold}`,
              fullPage: `data:image/png;base64,${screenshots.desktop.fullPage}`,
            },
            mobile: {
              aboveFold: `data:image/png;base64,${screenshots.mobile.aboveFold}`,
              fullPage: `data:image/png;base64,${screenshots.mobile.fullPage}`,
            },
          }
        : null,
    };

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error('Analysis error:', err);
    return NextResponse.json(
      { error: err.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
