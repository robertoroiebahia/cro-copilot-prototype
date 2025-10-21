/**
 * Page Analysis Prompt
 * For visual/screenshot-based CRO analysis
 */

import { PromptBuilder } from '@/lib/utils/llm';

export interface PageAnalysisPromptInput {
  url: string;
  markdown: string;
  screenshot?: string; // Screenshot URL or base64 data URL
  context?: Record<string, any>;
}

export function buildPageAnalysisPrompt(input: PageAnalysisPromptInput): string {
  const builder = new PromptBuilder();

  builder
    .section(
      'Task',
      input.screenshot
        ? 'You are an expert CRO analyst performing VISUAL PAGE ANALYSIS. Analyze the provided screenshot and page content to extract conversion optimization insights based on what you can SEE and READ - NOT data or analytics.'
        : 'You are an expert CRO analyst performing PAGE ANALYSIS. Analyze this landing page content to extract conversion optimization insights based on what you can observe in the content - NOT data or analytics.'
    )
    .section('Page URL', input.url);

  // Note: Screenshot is handled separately in vision-enabled LLM calls
  if (input.screenshot) {
    builder.section(
      'Visual Analysis',
      'A full-page screenshot is provided. Carefully analyze ALL visual elements including layout, design, typography, colors, spacing, CTAs, forms, images, and overall visual hierarchy.'
    );
  }

  builder.section('Page Content (Markdown)', input.markdown.slice(0, 15000)); // Limit content

  if (input.context) {
    builder.section('Context', JSON.stringify(input.context, null, 2));
  }

  builder
    .section(
      'CRITICAL: Visual Analysis Only',
      `
This is PAGE ANALYSIS - you're analyzing SCREENSHOTS and PAGE CONTENT, NOT analytics data.

Focus on what you can observe visually:
✅ Visual hierarchy and layout
✅ CTA clarity, placement, and design
✅ Trust signals (reviews, testimonials, logos, badges)
✅ Value proposition clarity
✅ Messaging and copy effectiveness
✅ Form design and friction points
✅ Mobile UX and responsive design
✅ Social proof elements
✅ Information architecture
✅ Cognitive load and clarity
✅ Urgency/scarcity elements
✅ Navigation and user flow

❌ DO NOT reference analytics data (bounce rate, conversion rate, etc.)
❌ DO NOT make up metrics you can't see
❌ DO NOT assume backend performance data
      `.trim()
    )
    .section(
      'Insight Extraction Instructions',
      `
Extract individual, actionable CRO insights. Each insight must be:
- **Atomic**: One specific observation about the page
- **Visual**: Based on what you can SEE in the content/screenshot
- **Actionable**: Can be tested or fixed
- **Evidence-based**: Supported by observable elements
- **Impact-focused**: Meaningful for conversion optimization

For each insight, provide ALL of these fields:

REQUIRED FIELDS:
- title: Short descriptive title (max 100 chars) - e.g., "Weak primary CTA contrast"
- statement: Full insight statement following format: "[Customer Segment] [Observation] [Visual Evidence]"
  Example: "Mobile visitors encounter a low-contrast CTA button that blends with the background, reducing visual prominence and click likelihood"
- growth_pillar: Which growth area this impacts
  Options: "conversion", "aov", "frequency", "retention", "acquisition"
- confidence_level: Your confidence in this insight
  Options: "high", "medium", "low"
- priority: Business priority based on impact potential
  Options: "critical", "high", "medium", "low"

EVIDENCE & CONTEXT:
- evidence: {
    quantitative?: { metric: string, value: string, sample_size?: number, comparison?: string },
    qualitative?: { quotes: string[], sources: string[] }
  }
  For visual analysis, use qualitative evidence with observations
- page_location: Array of page sections where observed
  Examples: ["hero"], ["navigation", "header"], ["product_details"], ["cart"], ["checkout"], ["footer"]
- device_type: Which device context this applies to
  Options: "mobile", "desktop", "tablet", "all"

CATEGORIZATION (Optional but recommended):
- customer_segment: Who this affects - e.g., "First-time visitors", "Mobile users", "High-intent shoppers"
- journey_stage: Where in customer journey
  Options: "awareness", "consideration", "decision", "post_purchase"
- friction_type: Type of UX friction observed
  Options: "usability", "trust", "value_perception", "information_gap", "cognitive_load"
- psychology_principle: Psychological principle involved
  Options: "loss_aversion", "social_proof", "scarcity", "authority", "anchoring"
- tags: Array of tags for categorization - e.g., ["#mobile", "#trust", "#cta", "#friction"]
- affected_kpis: Which KPIs this likely impacts - e.g., ["Click-through rate", "Add-to-cart rate", "Form completion"]

ACTIONS & METADATA:
- suggested_actions: Initial recommendations (1-2 sentences)
- validation_status: Always "untested" for new insights
      `.trim()
    )
    .raw(
      `
Return a JSON object with this exact structure:
{
  "insights": [
    {
      "title": "Weak above-the-fold value proposition",
      "statement": "First-time visitors landing on the homepage see a generic hero headline that doesn't clearly communicate the unique value proposition, creating uncertainty about what makes this product different from competitors",
      "growth_pillar": "conversion",
      "confidence_level": "high",
      "priority": "high",
      "evidence": {
        "qualitative": {
          "quotes": ["Hero headline reads 'Welcome to Our Store'", "No clear differentiation visible in fold"],
          "sources": ["Hero section", "Above-fold content"]
        }
      },
      "page_location": ["hero", "homepage"],
      "device_type": "all",
      "customer_segment": "First-time visitors",
      "journey_stage": "awareness",
      "friction_type": "value_perception",
      "psychology_principle": "anchoring",
      "tags": ["#value_prop", "#messaging", "#hero"],
      "affected_kpis": ["Bounce rate", "Time on page", "Scroll depth"],
      "suggested_actions": "Test a benefit-driven headline that clearly states the unique value proposition. Consider A/B testing specific value claims.",
      "validation_status": "untested"
    }
  ]
}

IMPORTANT:
- Generate 8-15 high-quality insights per page
- Focus on VISUAL observations only
- Do NOT fabricate metrics or data
- Prioritize insights by potential impact
- Be specific about what you observe
      `.trim()
    );

  return builder.build();
}
