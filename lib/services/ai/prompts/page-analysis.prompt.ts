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
- title: Short, actionable title (3-7 words max) - Focus on the PROBLEM or OPPORTUNITY, not technical jargon
  GOOD: "CTA button lacks contrast", "No trust signals above fold", "Confusing checkout flow"
  BAD: "Visual hierarchy optimization needed", "Trust signal implementation", "UX friction detected"
- statement: Full insight in plain English (1-2 sentences). Explain what you see, why it matters, and the likely impact.
  Write like you're talking to a business owner, not a developer.
  Example: "The primary CTA button uses a light gray color that blends into the background, making it hard for visitors to find where to click. This likely causes people to leave without taking action."
- growth_pillar: Which growth area this impacts
  Options: "conversion", "aov", "frequency", "retention", "acquisition"
- confidence_level: Your confidence in this insight
  Options: "high", "medium", "low"
- priority: Business priority based on impact potential
  Options: "critical", "high", "medium", "low"

EVIDENCE & CONTEXT:
- evidence: Use NATURAL LANGUAGE for evidence, not robotic JSON. Write like a human analyst explaining what you found.
  GOOD: "Looking at the survey responses, 15 out of 20 customers mentioned they weren't sure if the site was secure. Several said things like 'I wanted to see security badges' and 'No SSL seal made me nervous.'"
  BAD: Raw timestamps, technical data dumps, or JSON structures

  For visual analysis, describe what you observe:
  GOOD: "The CTA button appears in light gray (#E8E8E8) against a white background, creating minimal contrast. It's positioned below the fold on mobile devices."
  BAD: { "qualitative": { "quotes": ["button color: #E8E8E8"], "sources": ["CTA section"] } }
- page_location: Array of page sections where observed
  Examples: ["hero"], ["navigation", "header"], ["product_details"], ["cart"], ["checkout"], ["footer"]
- device_type: Which device context this applies to
  Options: "mobile", "desktop", "tablet", "all"

CATEGORIZATION - **ONLY FILL IF YOU ARE 100% CERTAIN**:
- customer_segment: Who this affects - e.g., "First-time visitors", "Mobile users", "High-intent shoppers"
  **Set to "N/A" if not explicitly clear from the data**
- journey_stage: Where in customer journey
  Options: "awareness", "consideration", "decision", "post_purchase"
  **Set to "N/A" if you're not certain which stage this applies to**
- friction_type: Type of UX friction observed - **ONLY if there IS friction**
  Options: "usability", "trust", "value_perception", "information_gap", "cognitive_load"
  **Set to "N/A" if this insight is NOT about friction/problems**
- psychology_principle: Psychological principle involved - **ONLY if clearly applicable**
  Options: "loss_aversion", "social_proof", "scarcity", "authority", "anchoring"
  **Set to "N/A" if no clear psychological principle applies. DO NOT guess.**
- tags: Array of tags for categorization - e.g., ["#mobile", "#trust", "#cta", "#friction"]
  **Only include tags that are directly relevant to what you observed**
- affected_kpis: Which KPIs this likely impacts - e.g., ["Click-through rate", "Add-to-cart rate", "Form completion"]
  **Only include KPIs that would DIRECTLY be impacted by this specific insight. Leave empty array [] if none clearly apply.**

**CRITICAL - DO NOT HALLUCINATE:**
- If you're not 100% certain about a field, set it to "N/A"
- DO NOT guess psychology principles - most insights don't have one
- DO NOT make up KPIs that wouldn't be directly affected
- DO NOT invent customer segments that aren't obvious from the data
- When in doubt, use "N/A"

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
      "title": "Generic hero headline",
      "statement": "The homepage hero says 'Welcome to Our Store' which doesn't tell visitors what makes you different or why they should buy from you instead of competitors. This creates confusion and likely causes people to leave without exploring further.",
      "growth_pillar": "conversion",
      "confidence_level": "high",
      "priority": "high",
      "evidence": "The hero headline is generic and doesn't communicate any unique value. Visitors landing on the page see no clear differentiation from competitors in the above-the-fold area.",
      "page_location": ["hero", "homepage"],
      "device_type": "all",
      "customer_segment": "First-time visitors",
      "journey_stage": "awareness",
      "friction_type": "value_perception",
      "psychology_principle": "N/A",
      "tags": ["#value_prop", "#messaging"],
      "affected_kpis": ["Bounce rate"],
      "suggested_actions": "Replace with a benefit-focused headline that clearly states what you do and why it matters. Test variations that lead with the main customer benefit.",
      "validation_status": "untested"
    }
  ]
}

IMPORTANT:
- Generate 0-5 high-quality insights per page ONLY - Focus on STATISTICALLY SIGNIFICANT observations
- Quality over quantity - only include insights that are:
  * Backed by clear visual evidence
  * High business impact potential
  * Actionable and testable
  * Not subjective opinions
- If there are NO significant issues or opportunities, return fewer insights or empty array
- Focus on VISUAL observations only
- Do NOT fabricate metrics or data
- Prioritize insights by potential impact
- Be specific about what you observe
      `.trim()
    );

  return builder.build();
}
