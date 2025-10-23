# CSV-Based Analysis Types

**Premium Features:** Survey Analysis, Review Mining, Onsite Poll
**Pattern:** User uploads CSV → AI processes with specialized prompt → Returns insights

---

## Survey Analysis

### User Input
- CSV file with survey responses
- Must contain a column with text responses/answers/feedback

### Expected CSV Columns
```csv
response_id, response_text, timestamp, user_segment (optional)
1, "The checkout process was confusing...", 2024-10-20, new_user
2, "I love the product but shipping is slow...", 2024-10-21, returning_user
```

### AI Prompt Structure
```
You are analyzing survey responses to extract actionable CRO insights.

SURVEY DATA:
{csv_content}

INSTRUCTIONS:
1. Identify common patterns and themes in the responses
2. Extract specific friction points mentioned by users
3. Highlight positive feedback that reveals what's working
4. Categorize insights by growth pillar (conversion, retention, acquisition, etc.)
5. Prioritize insights by frequency and impact

OUTPUT FORMAT:
Return an array of insights following this exact structure:
{
  "title": "Brief, actionable title",
  "statement": "Detailed description of the insight with evidence",
  "growth_pillar": "conversion|aov|frequency|retention|acquisition",
  "confidence_level": "high|medium|low",
  "priority": "critical|high|medium|low",
  "evidence": {
    "qualitative": {
      "quotes": ["Direct quote from survey response 1", "Quote 2"],
      "sources": ["Survey responses"]
    },
    "quantitative": {
      "metrics": [
        {
          "name": "Respondents mentioning issue",
          "value": "23",
          "unit": "responses"
        }
      ]
    }
  },
  "customer_segment": "Target user segment",
  "journey_stage": "awareness|consideration|purchase|retention",
  "friction_type": "usability|trust|value|complexity",
  "psychology_principle": "loss_aversion|social_proof|anchoring|etc",
  "tags": ["#survey", "#feedback", "#pain-point"],
  "affected_kpis": ["Response rate", "Customer satisfaction"],
  "suggested_actions": "Specific recommendation based on feedback"
}

Focus on insights that are:
- Specific and actionable
- Supported by multiple responses (unless critical)
- Connected to measurable business impact
```

---

## Review Mining

### User Input
- CSV file with product/service reviews
- Must contain review text (and optionally rating, date, source)

### Expected CSV Columns
```csv
review_id, review_text, rating, date, source, product_name (optional)
1, "Great product but difficult to set up...", 4, 2024-10-15, Google, Widget Pro
2, "Customer service was amazing...", 5, 2024-10-16, Trustpilot, Widget Pro
```

### AI Prompt Structure
```
You are analyzing customer reviews to extract CRO insights.

REVIEW DATA:
{csv_content}

INSTRUCTIONS:
1. Identify patterns in positive reviews (what's driving satisfaction)
2. Extract friction points from negative reviews
3. Analyze sentiment trends across rating levels
4. Look for conversion blockers mentioned in reviews
5. Identify opportunities for social proof and testimonials
6. Find common objections that should be addressed pre-purchase

OUTPUT FORMAT:
Return an array of insights following this exact structure:
{
  "title": "Brief, actionable title",
  "statement": "Detailed insight with supporting evidence from reviews",
  "growth_pillar": "conversion|aov|frequency|retention|acquisition",
  "confidence_level": "high|medium|low",
  "priority": "critical|high|medium|low",
  "evidence": {
    "qualitative": {
      "quotes": ["Direct quote from review 1", "Quote 2"],
      "sources": ["Customer reviews"]
    },
    "quantitative": {
      "metrics": [
        {
          "name": "Reviews mentioning this",
          "value": "45",
          "unit": "reviews"
        },
        {
          "name": "Average rating when mentioned",
          "value": "3.2",
          "unit": "stars"
        }
      ]
    }
  },
  "customer_segment": "Based on review patterns",
  "journey_stage": "awareness|consideration|purchase|retention",
  "friction_type": "usability|trust|value|complexity",
  "psychology_principle": "social_proof|trust|reciprocity|etc",
  "tags": ["#reviews", "#customer-feedback", "#social-proof"],
  "affected_kpis": ["Conversion rate", "Trust score", "Review rating"],
  "suggested_actions": "How to address this insight"
}

Prioritize insights that:
- Appear frequently across multiple reviews
- Impact conversion decisions
- Can be quickly addressed to improve ratings
```

---

## Onsite Poll

### User Input
- CSV file with poll responses
- Must contain question and answer columns

### Expected CSV Columns
```csv
poll_id, question, response, timestamp, page_url (optional), user_id (optional)
1, "What stopped you from completing checkout?", "Shipping cost too high", 2024-10-20, /checkout
2, "What stopped you from completing checkout?", "Just browsing", 2024-10-20, /checkout
3, "What information is missing?", "Size chart unclear", 2024-10-21, /product/123
```

### AI Prompt Structure
```
You are analyzing onsite poll responses to extract CRO insights.

POLL DATA:
{csv_content}

INSTRUCTIONS:
1. Group responses by question to identify patterns
2. Quantify the most common friction points or objections
3. Identify page-specific issues (if page_url provided)
4. Extract actionable insights for each major response pattern
5. Prioritize based on frequency and impact on conversion

OUTPUT FORMAT:
Return an array of insights following this exact structure:
{
  "title": "Brief, actionable title",
  "statement": "Detailed insight based on poll responses",
  "growth_pillar": "conversion|aov|frequency|retention|acquisition",
  "confidence_level": "high|medium|low",
  "priority": "critical|high|medium|low",
  "evidence": {
    "qualitative": {
      "quotes": ["Response 1", "Response 2"],
      "sources": ["Onsite poll"]
    },
    "quantitative": {
      "metrics": [
        {
          "name": "Users selecting this response",
          "value": "67",
          "unit": "responses"
        },
        {
          "name": "Percentage of total",
          "value": "34",
          "unit": "%"
        }
      ]
    }
  },
  "customer_segment": "Users who saw this poll",
  "journey_stage": "awareness|consideration|purchase|retention",
  "page_location": ["Page where poll appeared"],
  "friction_type": "usability|trust|value|complexity",
  "psychology_principle": "loss_aversion|clarity|trust|etc",
  "tags": ["#poll", "#user-feedback", "#conversion-blocker"],
  "affected_kpis": ["Conversion rate", "Bounce rate", "Exit rate"],
  "suggested_actions": "Specific recommendation to address poll findings"
}

Focus on:
- Most frequent responses (top blockers/issues)
- Patterns across different pages
- Immediate action items to reduce friction
```

---

## Implementation Pattern

### 1. CSV Upload Component
```typescript
// Simple file upload for CSV
<input
  type="file"
  accept=".csv"
  onChange={handleCSVUpload}
/>
```

### 2. CSV Processing
```typescript
// Parse CSV on client or send to API
const parseCSV = (file: File) => {
  // Use papaparse or similar
  // Validate required columns
  // Send to API
}
```

### 3. API Endpoint Pattern
```typescript
// app/api/analyze-csv/route.ts (existing endpoint can be enhanced)
export async function POST(request: NextRequest) {
  const { csvContent, analysisType } = await request.json();

  // Get appropriate prompt based on analysisType
  const systemPrompt = getAnalysisPrompt(analysisType);

  // Call OpenAI with CSV data + prompt
  const insights = await extractInsights(csvContent, systemPrompt);

  // Save to database (same as page analysis)
  // Return insights
}
```

### 4. Prompt Selection
```typescript
function getAnalysisPrompt(type: 'survey' | 'review_mining' | 'onsite_poll'): string {
  const prompts = {
    survey: SURVEY_ANALYSIS_PROMPT,
    review_mining: REVIEW_MINING_PROMPT,
    onsite_poll: ONSITE_POLL_PROMPT,
  };

  return prompts[type];
}
```

---

## CSV Validation

### Required Checks
1. **File format** - Must be CSV
2. **File size** - Reasonable limit (e.g., 5MB max)
3. **Required columns** - Must have text column with responses
4. **Row count** - Minimum responses needed for meaningful analysis (e.g., 10 rows)

### Error Messages
- "CSV must contain a column with text responses (e.g., 'response', 'answer', 'feedback')"
- "File too large. Maximum size is 5MB"
- "Not enough responses. Minimum 10 responses required for analysis"
- "Invalid CSV format. Please check your file"

---

## User Flow

### Survey Analysis Flow
1. User clicks "Survey Analysis" (Pro only)
2. If Free → Show upgrade modal
3. If Pro → Show CSV upload interface
4. User uploads CSV
5. System validates CSV
6. User clicks "Analyze"
7. API processes with survey prompt
8. Insights displayed (same as page analysis)

### UI Components Needed
- CSV upload dropzone
- Column mapping (let user select which column has responses)
- Preview of first few rows
- Upload button with progress indicator

---

## Example CSV Templates

We should provide downloadable templates:

### survey-template.csv
```csv
response_id,response_text,timestamp
1,"The checkout process was confusing and I abandoned my cart",2024-10-20 10:30:00
2,"Love the product quality but shipping is expensive",2024-10-20 11:15:00
3,"Website loads slowly on mobile",2024-10-20 14:22:00
```

### review-template.csv
```csv
review_id,review_text,rating,date
1,"Great product but difficult to set up",4,2024-10-15
2,"Customer service was amazing",5,2024-10-16
3,"Not worth the price",2,2024-10-17
```

### poll-template.csv
```csv
question,response,timestamp
"What stopped you from completing checkout?","Shipping cost too high",2024-10-20 10:30:00
"What stopped you from completing checkout?","Just browsing",2024-10-20 11:15:00
"What information is missing?","Size chart unclear",2024-10-21 14:22:00
```

---

## Next Steps

1. **Phase 3.2** - Implement feature gating (Pro badges, upgrade modals)
2. **Phase 3.3** - Build CSV upload UI components
3. **Phase 3.4** - Create prompt templates for each analysis type
4. **Phase 3.5** - Integrate with existing analyze-csv endpoint
5. **Phase 3.6** - Add download template links

**Note:** CSV analysis is MUCH simpler than we initially thought. No complex scraping, just:
- Upload CSV
- Send to LLM with specialized prompt
- Get insights back
- Display like any other analysis

This makes the premium features very easy to implement!
