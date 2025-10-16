import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import axios from 'axios';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

export async function POST(req: NextRequest) {
  try {
    const { url, metrics, context } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const pageData = await analyzePage(url);
    
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

### YOUR TASK

Provide a deep analysis in this JSON format:

{
  "landingPageSummary": "One clear sentence about what this LP communicates and how well it does it",
  "keyIssues": [
    "Specific issue with conversion impact explained",
    "Another specific blocker"
  ],
  "recommendations": [
    {
      "priority": "High",
      "title": "Test benefit-focused headline vs current feature-focused one",
      "description": "Detailed explanation of the experiment and why it will work",
      "hypothesis": "If we lead with the transformation outcome instead of product features, ATC rate will increase because customers buy outcomes, not features",
      "expectedLift": "12-18%",
      "before": "Current headline copy",
      "after": "Suggested new headline",
      "difficulty": "Easy",
      "principle": "Jobs-to-be-done framework - people don't want a drill, they want a hole"
    }
  ],
  "messagingOpportunities": [
    "Alternative angle: Position as [X] instead of [Y] for [audience segment]",
    "Test messaging for [adjacent audience]"
  ],
  "quickWins": [
    "Specific 1-hour fix with expected impact",
    "Another immediate change"
  ],
  "croChecklist": [
    "Action item 1",
    "Action item 2"
  ]
}

Focus recommendations on improving ATC rate and top-of-funnel conversion. Be brutally specific.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const insights = JSON.parse(response.choices[0].message.content || '{}');

    return NextResponse.json({
      ...insights,
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
    });
  } catch (err: any) {
    console.error('Analysis error:', err);
    return NextResponse.json(
      { error: err.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}