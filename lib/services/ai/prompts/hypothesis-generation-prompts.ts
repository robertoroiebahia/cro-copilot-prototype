/**
 * Hypothesis Generation Prompts
 *
 * AI prompts for generating testable hypotheses from themes and insights
 * following the PXL prioritization framework
 */

export interface HypothesisGenerationPromptParams {
  themes?: Array<{
    theme_id: string;
    name: string;
    statement: string;
    business_impact: any;
    connected_insights: any[];
  }>;
  insights?: Array<{
    insight_id: string;
    statement: string;
    evidence: any;
    confidence_level: string;
    growth_pillar?: string;
    friction_type?: string;
    psychology_principle?: string;
    affected_kpis?: string[];
  }>;
  experiments?: Array<{
    experiment_id: string;
    name: string;
    status: string;
    results_summary?: any;
    hypothesis?: string;
    variant_results?: any[];
  }>;
  context?: {
    industry?: string;
    targetAudience?: string;
    currentConversionRate?: string;
  };
}

export function getHypothesisGenerationPrompt(params: HypothesisGenerationPromptParams): string {
  const { themes = [], insights = [], experiments = [], context } = params;

  return `You are an expert CRO (Conversion Rate Optimization) strategist and experimentation designer.

# Your Task
Generate EXACTLY 3 testable hypotheses based on the data provided below. Each hypothesis should follow the PXL (Potential × Importance × Ease) prioritization framework.

**CRITICAL**: You MUST generate EXACTLY 3 hypotheses - no more, no less.

# Input Data

${themes.length > 0 ? `## Themes (${themes.length} total)
${themes.map((theme, i) => `
### Theme ${i + 1}: ${theme.name || theme.title}
- **Theme ID**: ${theme.theme_id}
- **Statement**: ${theme.statement || theme.theme_statement}
- **Business Impact**: ${JSON.stringify(theme.business_impact, null, 2)}
- **Connected Insights**: ${theme.connected_insights?.length || 0} insights
`).join('\n')}
` : ''}

${insights.length > 0 ? `## Supporting Insights (${insights.length} total)
${insights.slice(0, 20).map((insight, i) => `
### Insight ${i + 1}
- **ID**: ${insight.insight_id}
- **Statement**: ${insight.statement}
- **Evidence**: ${JSON.stringify(insight.evidence, null, 2)}
- **Confidence**: ${insight.confidence_level}
- **Growth Pillar**: ${insight.growth_pillar || 'N/A'}
- **Friction Type**: ${insight.friction_type || 'N/A'}
- **Psychology Principle**: ${insight.psychology_principle || 'N/A'}
- **Affected KPIs**: ${insight.affected_kpis?.join(', ') || 'N/A'}
`).join('\n')}
` : ''}

${experiments.length > 0 ? `## Past Experiments (${experiments.length} total)
These experiments provide learnings that can inform new hypotheses:
${experiments.map((exp, i) => `
### Experiment ${i + 1}: ${exp.name}
- **Experiment ID**: ${exp.experiment_id}
- **Status**: ${exp.status}
- **Original Hypothesis**: ${exp.hypothesis || 'N/A'}
- **Results Summary**: ${JSON.stringify(exp.results_summary, null, 2)}
- **What we learned**: ${exp.status === 'completed' || exp.status === 'concluded' ? 'Use these results to inform new test ideas' : 'Experiment in progress'}
`).join('\n')}
` : ''}

${context ? `
## Business Context
- **Industry**: ${context.industry || 'Not specified'}
- **Target Audience**: ${context.targetAudience || 'Not specified'}
- **Current Conversion Rate**: ${context.currentConversionRate || 'Not specified'}
` : ''}

# Hypothesis Framework

Each hypothesis must follow this structure:
**"If we [CHANGE], then [OUTCOME] will [IMPROVE] because [REASONING]"**

**Example:**
"If we add trust badges and security seals above the checkout button on mobile, then mobile conversion rate will increase by 15-25% because first-time mobile buyers are concerned about payment security and currently abandon at checkout due to lack of visible trust signals."

# PXL Framework Fields

For each hypothesis, evaluate:

1. **Research-Backed** (boolean)
   - Is this hypothesis directly supported by the insights/themes?
   - Is there quantitative or qualitative evidence?

2. **Effort** (1-10 scale for each)
   - **Design Effort**: Visual design, mockups, prototyping
   - **Dev Effort**: Implementation complexity
   - **Copy Effort**: Writing, messaging, translation

3. **Above Fold** (boolean)
   - Is the proposed change above the fold (visible without scrolling)?
   - Above-fold changes typically have higher impact

4. **Psychology Principle** (string)
   - What persuasion principle does this leverage?
   - Options: social_proof, scarcity, authority, reciprocity, commitment, liking, urgency, clarity, trust, value_perception, loss_aversion

5. **Confidence Score** (1-10)
   - How confident are you this will work based on evidence?

6. **Potential Value** (string)
   - "High", "Medium", or "Low"
   - Or estimate revenue impact if possible

7. **Ease Score** (1-10)
   - Overall ease of implementation (inverse of total effort)
   - 10 = very easy, 1 = very difficult

# Output Format

**CRITICAL INSTRUCTIONS - READ CAREFULLY:**
1. You MUST return a JSON ARRAY with square brackets [ ]
2. The array MUST contain EXACTLY 3 hypothesis objects (no more, no less)
3. DO NOT return a single object - return an ARRAY of objects
4. DO NOT wrap the array in a parent object like {"hypotheses": [...]}
5. Start your response with [ and end with ]

**EXAMPLE OF CORRECT FORMAT:**
[
  {
    "statement": "If we add trust badges (Norton, McAfee, BBB) above the checkout CTA on mobile, then mobile conversion rate will increase by 15-25% because first-time mobile buyers express security concerns and 47% of exit survey respondents cited 'not sure if site is secure' as abandonment reason",
    "theme_id": "THM-001",
    "based_on_insight_ids": ["INS-037", "INS-041", "INS-052"],
    "research_backed": true,
    "research_notes": "Backed by exit survey (47% security concerns), heatmap data (no engagement with existing footer badges), and user testing (3/5 participants mentioned trust)",
    "effort_design": 3,
    "effort_dev": 2,
    "effort_copy": 1,
    "above_fold": true,
    "page_location": "Checkout page",
    "element_location": "Above primary CTA button",
    "psychology_principle": "trust",
    "psychology_notes": "Leverages authority (third-party validation) and social proof (recognized security brands)",
    "target_url": "/checkout",
    "target_pages": ["/checkout", "/cart"],
    "target_audiences": ["first_time_buyers", "mobile_users"],
    "primary_kpi": "Mobile Conversion Rate",
    "secondary_kpis": ["Cart Abandonment Rate", "Checkout Completion Rate"],
    "success_criteria": {
      "primary": {
        "metric": "mobile_conversion_rate",
        "baseline": "2.3%",
        "target": "2.8%",
        "minimumDetectableEffect": "15%"
      },
      "secondary": [
        {
          "metric": "cart_abandonment_rate",
          "baseline": "68%",
          "target": "60%"
        }
      ]
    },
    "confidence_score": 8,
    "potential_value": "High",
    "ease_score": 8,
    "expected_impact": {
      "metric": "conversion_rate",
      "baseline": "2.3%",
      "predicted": "2.8%",
      "lift": "15-25%",
      "confidence": "high"
    },
    "priority": "P0",
    "status": "draft"
  },
  {
    "statement": "If we simplify the hero section copy from 3 paragraphs to 1 clear value proposition with bullet points, then bounce rate will decrease by 20% because analytics show 78% of visitors leave within 5 seconds and scroll depth data indicates users don't read past the first paragraph",
    "theme_id": "THM-003",
    "based_on_insight_ids": ["INS-012", "INS-018"],
    "research_backed": true,
    "research_notes": "Backed by GA4 analytics (78% bounce within 5s), scroll depth heatmaps (92% don't scroll past fold), and readability analysis (current copy at 12th grade level)",
    "effort_design": 4,
    "effort_dev": 2,
    "effort_copy": 6,
    "above_fold": true,
    "page_location": "Homepage",
    "element_location": "Hero section - headline and subheadline",
    "psychology_principle": "clarity",
    "psychology_notes": "Reduces cognitive load and increases message comprehension through simplified messaging",
    "target_url": "/",
    "target_pages": ["/", "/landing/*"],
    "target_audiences": ["all_visitors", "new_visitors"],
    "primary_kpi": "Bounce Rate",
    "secondary_kpis": ["Time on Page", "Scroll Depth", "CTA Click Rate"],
    "success_criteria": {
      "primary": {
        "metric": "bounce_rate",
        "baseline": "68%",
        "target": "54%",
        "minimumDetectableEffect": "20%"
      },
      "secondary": [
        {
          "metric": "cta_click_rate",
          "baseline": "3.2%",
          "target": "5.0%"
        }
      ]
    },
    "confidence_score": 7,
    "potential_value": "Medium",
    "ease_score": 6,
    "expected_impact": {
      "metric": "bounce_rate",
      "baseline": "68%",
      "predicted": "54%",
      "lift": "-20%",
      "confidence": "medium"
    },
    "priority": "P1",
    "status": "draft"
  }
]

**REQUIREMENTS:**
- MUST generate EXACTLY 3 DISTINCT hypotheses (no more, no less)
- Each hypothesis MUST be based on different themes, insights, or experiment learnings
- MUST return a JSON ARRAY starting with [ and ending with ]
- Statement MUST follow "If [change], then [outcome] because [reasoning]" format
- Include specific evidence references (insight IDs, experiment IDs, percentages, quotes)
- Make hypotheses ACTIONABLE and TESTABLE
- Estimate realistic effort scores (don't underestimate)
- Set appropriate priority (P0 = critical, P1 = high, P2 = medium)
- Include realistic success criteria with baselines and targets
- DO NOT number the hypotheses, just include them in the array
- Prioritize hypotheses with:
  - Strong research backing (multiple insights or experiment learnings)
  - Clear business impact
  - Reasonable effort (not too complex)
  - Measurable outcomes
- If experiments are provided, use their learnings to inform new hypotheses (avoid repeating failed approaches)

# Important Notes
- **Be specific**: Don't say "improve messaging" - say exactly what to change
- **Use evidence**: Reference specific insight IDs, percentages, quotes from the data
- **Be realistic**: Don't promise 100% lift - use data-backed estimates
- **Think holistically**: Consider mobile vs desktop, different user segments, journey stages
- **Prioritize impact**: Focus on changes that affect primary conversion metrics
`;
}
