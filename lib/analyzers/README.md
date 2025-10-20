## Analyzers

Analysis modules for extracting insights, clustering themes, and generating hypotheses.

## Modules

### 1. Insight Extractor v2 (`insight-extractor-v2.ts`)

Extracts atomic insights from page content using AI (GPT-4 or Claude).

**Input:**
- Page content (markdown, HTML)
- Analysis context

**Output:**
- List of atomic insights
- Each insight includes: type, category, severity, confidence, impact, effort

**Usage:**
```typescript
const extractor = createInsightExtractor('gpt');
const result = await extractor.execute({
  analysisId: 'abc123',
  userId: 'user123',
  url: 'https://example.com',
  content: pageContent,
});
```

### 2. Theme Clusterer (`theme-clusterer.ts`)

Groups related insights into coherent themes.

**Input:**
- List of atomic insights

**Output:**
- List of themes
- Each theme groups 2+ related insights

**Usage:**
```typescript
const clusterer = createThemeClusterer();
const result = await clusterer.execute({
  analysisId: 'abc123',
  userId: 'user123',
  insights: extractedInsights,
});
```

### 3. Hypothesis Generator (`hypothesis-generator.ts`)

Generates testable hypotheses from themes.

**Input:**
- Theme
- Related insights

**Output:**
- List of hypotheses
- Each in "If we X, then Y will Z because W" format

**Usage:**
```typescript
const generator = createHypothesisGenerator();
const result = await generator.execute({
  analysisId: 'abc123',
  userId: 'user123',
  theme: selectedTheme,
  insights: themeInsights,
});
```

### 4. Page Analyzer (`page-analyzer.ts`)

Orchestrates the complete analysis pipeline.

**Input:**
- URL
- Page content

**Output:**
- Insights
- Summary statistics

**Usage:**
```typescript
const analyzer = createPageAnalyzer('gpt');
const result = await analyzer.execute({
  analysisId: 'abc123',
  userId: 'user123',
  url: 'https://example.com',
  content: pageContent,
});
```

## Pipeline Flow

```
Page Content
    |
    v
[Insight Extractor] --> Atomic Insights
    |
    v
[Theme Clusterer] --> Themes
    |
    v
[Hypothesis Generator] --> Hypotheses
    |
    v
[Experiment Planner] --> Experiments
```

## Dependencies

- Module system (`lib/modules`)
- AI services (`lib/services/ai`)
- Type definitions (`lib/types`)
- Utilities (`lib/utils`)

## Configuration

Each analyzer is a module that can be:
- Enabled/disabled
- Configured with options
- Executed independently or in sequence
- Cached for performance

See `lib/modules/README.md` for more on module configuration.
