# Integration Guide

This guide explains how to work with external service integrations in the Smart Nudge Builder.

## Overview

The Integration Manager provides centralized management for all external services:

- Firecrawl (web scraping)
- OpenAI (GPT models)
- Anthropic (Claude models)
- Supabase (database)

## Architecture

```
IntegrationManager
├── Registration
├── Health Checking
├── Configuration
└── Event System
```

## Using the Integration Manager

### 1. Register an Integration

```typescript
import { integrationManager } from '@/lib/services/integration-manager';

integrationManager.register('my-service', {
  name: 'my-service',
  enabled: true,
  apiKey: process.env.MY_SERVICE_API_KEY,
  baseUrl: 'https://api.myservice.com',
  timeout: 30000,
  retries: 3,
});
```

### 2. Get an Integration

```typescript
const config = integrationManager.get('firecrawl');
if (config && config.enabled) {
  // Use the integration
}
```

### 3. Check Health

```typescript
const health = await integrationManager.checkHealth('openai');
console.log({
  status: health.status, // 'active' | 'inactive' | 'error' | 'rate_limited'
  latency: health.latency,
  errorCount: health.errorCount,
});
```

### 4. Enable/Disable

```typescript
// Temporarily disable an integration
integrationManager.setEnabled('anthropic', false);

// Re-enable it
integrationManager.setEnabled('anthropic', true);
```

## Service-Specific Guides

### Firecrawl Service

```typescript
import { createFirecrawlService } from '@/lib/services/firecrawl';

const firecrawl = createFirecrawlService({
  apiKey: process.env.FIRECRAWL_API_KEY,
  formats: ['markdown', 'html'],
  onlyMainContent: true,
});

// Scrape a single URL
const result = await firecrawl.scrape('https://example.com');

if (result.success) {
  console.log('Markdown:', result.markdown);
  console.log('Metadata:', result.metadata);
}

// Batch scrape
const results = await firecrawl.scrapeBatch([
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3',
]);
```

### GPT Insights Extractor

```typescript
import { createGPTInsightsExtractor } from '@/lib/services/ai/gpt-insights';

const extractor = createGPTInsightsExtractor(
  process.env.OPENAI_API_KEY,
  'gpt-4-turbo'
);

const response = await extractor.extract({
  analysisId: 'abc123',
  userId: 'user123',
  content: {
    url: 'https://example.com',
    markdown: pageMarkdown,
  },
  options: {
    maxInsights: 20,
    minConfidence: 70,
  },
});

console.log('Insights:', response.insights);
console.log('Tokens used:', response.metadata.tokensUsed);
```

### Claude Insights Extractor

```typescript
import { createClaudeInsightsExtractor } from '@/lib/services/ai/claude-insights';

const extractor = createClaudeInsightsExtractor(
  process.env.ANTHROPIC_API_KEY,
  'claude-3-sonnet-20240229'
);

const response = await extractor.extract({
  analysisId: 'abc123',
  userId: 'user123',
  content: {
    url: 'https://example.com',
    markdown: pageMarkdown,
  },
});
```

## Event System

Listen to integration events:

```typescript
import { IntegrationEvent } from '@/lib/types/integrations';

integrationManager.on(IntegrationEvent.ERROR, (payload) => {
  console.error(`Integration ${payload.name} error:`, payload.metadata);
});

integrationManager.on(IntegrationEvent.RATE_LIMIT, (payload) => {
  console.warn(`Integration ${payload.name} rate limited`);
});
```

## Error Handling

All integrations use typed errors:

```typescript
import { ExternalServiceError, LLMError } from '@/lib/utils/errors';

try {
  const result = await firecrawl.scrape(url);
} catch (error) {
  if (error instanceof ExternalServiceError) {
    console.error('Service:', error.context?.service);
    console.error('Message:', error.message);
  } else if (error instanceof LLMError) {
    console.error('LLM Provider:', error.context?.provider);
    console.error('Model:', error.context?.model);
  }
}
```

## Best Practices

1. **Always check if integration is enabled:**
   ```typescript
   const config = integrationManager.get('service-name');
   if (!config || !config.enabled) {
     throw new Error('Service not available');
   }
   ```

2. **Use health checks before critical operations:**
   ```typescript
   const health = await integrationManager.checkHealth('openai');
   if (health.status !== 'active') {
     // Use fallback or retry later
   }
   ```

3. **Handle rate limits gracefully:**
   ```typescript
   try {
     const result = await service.call();
   } catch (error) {
     if (error instanceof RateLimitError) {
       // Wait and retry
       await wait(error.context?.retryAfter || 60000);
     }
   }
   ```

4. **Monitor integration statistics:**
   ```typescript
   const stats = integrationManager.getStats();
   console.log(`${stats.healthy}/${stats.enabled} integrations healthy`);
   ```

## Environment Variables

Required environment variables for each integration:

```bash
# Firecrawl
FIRECRAWL_API_KEY=fc-...

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Testing Integrations

```typescript
// Test if integration is working
const health = await integrationManager.checkHealth('firecrawl');
console.log('Firecrawl:', health.status);

// Test scraping
const firecrawl = createFirecrawlService();
const isWorking = await firecrawl.healthCheck();
console.log('Firecrawl working:', isWorking);
```

## Troubleshooting

### Integration not found
```typescript
if (!integrationManager.has('service-name')) {
  // Integration not registered
  // Check environment variables
}
```

### Integration disabled
```typescript
const config = integrationManager.get('service-name');
if (!config.enabled) {
  // Re-enable or check configuration
  integrationManager.setEnabled('service-name', true);
}
```

### Health check failures
```typescript
const health = await integrationManager.checkHealth('service-name');
if (health.status === 'error') {
  console.error('Error:', health.message);
  // Check API keys, network, service status
}
```
