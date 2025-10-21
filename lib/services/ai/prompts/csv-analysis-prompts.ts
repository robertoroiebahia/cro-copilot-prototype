/**
 * CSV Analysis Prompts
 *
 * Specialized prompts for analyzing different types of CSV data
 */

export interface CSVAnalysisPromptParams {
  researchType: 'survey_analysis' | 'onsite_poll' | 'review_mining';
  dataPreview: string[];
  totalRows: number;
  headers: string[];
}

export function getCSVAnalysisPrompt(params: CSVAnalysisPromptParams): string {
  const { researchType, dataPreview, totalRows, headers } = params;

  const baseInstructions = `You are a CRO (Conversion Rate Optimization) analyst analyzing customer feedback data.

# Data Overview
- Total responses: ${totalRows}
- Columns: ${headers.join(', ')}

# Sample Data (first ${dataPreview.length} entries)
${dataPreview.slice(0, 20).map((entry, i) => `${i + 1}. ${entry}`).join('\n')}

${totalRows > 20 ? `\n... and ${totalRows - 20} more responses` : ''}`;

  switch (researchType) {
    case 'survey_analysis':
      return `${baseInstructions}

# Your Task: Survey Analysis
Analyze these survey responses to extract actionable insights for conversion optimization.

Focus on:
1. **Common Themes** - What topics appear frequently?
2. **Pain Points** - What problems or frustrations do customers mention?
3. **Desires & Expectations** - What do customers want or expect?
4. **Sentiment Patterns** - Overall tone (positive, negative, neutral) and intensity
5. **Journey Stage Issues** - Problems at specific stages (awareness, consideration, decision, retention)
6. **Segment Differences** - Any patterns by customer type, product, or demographic

# Output Format
Return a JSON array of insights with this structure:
[
  {
    "insight_type": "friction_point | expectation_gap | segment_difference | sentiment_pattern | theme",
    "statement": "Clear observation from the data (no recommendations)",
    "evidence": {
      "qualitative": {
        "quotes": ["exact quote 1", "exact quote 2", "exact quote 3"],
        "theme_frequency": "X% of responses mentioned..."
      }
    },
    "customer_segment": "segment if applicable",
    "journey_stage": "awareness | consideration | decision | retention",
    "friction_type": "usability | trust | value_perception | process | technical | information",
    "psychology_principle": "if applicable: social_proof | scarcity | authority | reciprocity | commitment | anchoring",
    "priority": "critical | high | medium | low",
    "confidence_level": "high | medium | low",
    "affected_kpis": ["Conversion Rate", "Cart Abandonment", etc]
  }
]

Generate 8-15 high-quality insights. Be specific and quote actual customer language.`;

    case 'onsite_poll':
      return `${baseInstructions}

# Your Task: Onsite Poll Analysis
Analyze these poll responses to understand customer preferences and decision-making factors.

Focus on:
1. **Response Patterns** - Most common answers and their frequency
2. **Unexpected Responses** - Surprising or outlier answers
3. **Decision Factors** - What influences customer choices?
4. **Barriers** - What prevents customers from taking action?
5. **Feature Requests** - What do customers want that they don't have?
6. **Behavioral Signals** - What do responses reveal about intent?

# Output Format
Return a JSON array of insights with this structure:
[
  {
    "insight_type": "preference_pattern | barrier | feature_gap | behavioral_signal",
    "statement": "Clear observation from poll data (no recommendations)",
    "evidence": {
      "quantitative": {
        "percentage": "X% responded...",
        "sample_size": ${totalRows}
      },
      "qualitative": {
        "quotes": ["exact response 1", "exact response 2"]
      }
    },
    "customer_segment": "segment if applicable",
    "journey_stage": "awareness | consideration | decision",
    "priority": "critical | high | medium | low",
    "confidence_level": "high | medium | low",
    "affected_kpis": ["Conversion Rate", "Average Order Value", etc]
  }
]

Generate 6-12 insights based on poll patterns.`;

    case 'review_mining':
      return `${baseInstructions}

# Your Task: Review Mining
Extract conversion optimization insights from customer reviews.

Focus on:
1. **Product/Service Strengths** - What customers love (use for marketing/social proof)
2. **Pain Points** - Problems that hurt conversion or cause returns
3. **Comparison Shopping** - What customers compare you against
4. **Purchase Motivations** - Why did they choose you?
5. **Hesitations** - What almost stopped them from buying?
6. **Post-Purchase Experience** - Satisfaction, regret, delight
7. **Language & Terminology** - How do customers describe products/benefits?

# Output Format
Return a JSON array of insights with this structure:
[
  {
    "insight_type": "strength | pain_point | comparison | motivation | hesitation | terminology",
    "statement": "Clear observation from reviews (no recommendations)",
    "evidence": {
      "qualitative": {
        "quotes": ["exact quote 1", "exact quote 2", "exact quote 3"],
        "mention_frequency": "mentioned in X reviews"
      },
      "quantitative": {
        "percentage": "X% of reviews mentioned..."
      }
    },
    "customer_segment": "segment if applicable",
    "journey_stage": "consideration | decision | retention",
    "friction_type": "if pain point: usability | trust | value_perception | quality",
    "psychology_principle": "social_proof | authority | scarcity | commitment",
    "priority": "critical | high | medium | low",
    "confidence_level": "high | medium | low",
    "affected_kpis": ["Conversion Rate", "Return Rate", "Customer Lifetime Value", etc],
    "tags": ["#review", "#customer_voice"]
  }
]

Generate 10-20 insights. Include exact customer quotes and prioritize insights that impact conversion.`;
  }
}
