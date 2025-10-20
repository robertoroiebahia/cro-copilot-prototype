/**
 * Integration Types
 * Defines types for external service integrations
 */

/**
 * Integration Configuration
 */
export interface IntegrationConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  options?: Record<string, unknown>;
}

/**
 * Integration Status
 */
export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  RATE_LIMITED = 'rate_limited',
}

/**
 * Integration Health Check
 */
export interface IntegrationHealth {
  status: IntegrationStatus;
  lastChecked: Date;
  latency?: number;
  errorCount?: number;
  message?: string;
}

/**
 * Firecrawl Integration Types
 */
export interface FirecrawlConfig extends IntegrationConfig {
  formats?: ('markdown' | 'html' | 'rawHtml' | 'screenshot' | 'links')[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  waitFor?: number;
}

export interface FirecrawlScrapeResult {
  success: boolean;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  screenshot?: string;
  links?: string[];
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    sourceURL?: string;
    statusCode?: number;
  };
  error?: string;
}

/**
 * OpenAI Integration Types
 */
export interface OpenAIConfig extends IntegrationConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

/**
 * Anthropic Integration Types
 */
export interface AnthropicConfig extends IntegrationConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface AnthropicUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

/**
 * Supabase Integration Types
 */
export interface SupabaseConfig extends IntegrationConfig {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Integration Manager
 */
export interface IIntegrationManager {
  /**
   * Register an integration
   */
  register(name: string, config: IntegrationConfig): void;

  /**
   * Get integration by name
   */
  get<T extends IntegrationConfig>(name: string): T | undefined;

  /**
   * Check integration health
   */
  checkHealth(name: string): Promise<IntegrationHealth>;

  /**
   * Enable/disable integration
   */
  setEnabled(name: string, enabled: boolean): void;

  /**
   * Get all registered integrations
   */
  list(): string[];
}

/**
 * Integration Events
 */
export enum IntegrationEvent {
  REGISTERED = 'integration.registered',
  ENABLED = 'integration.enabled',
  DISABLED = 'integration.disabled',
  ERROR = 'integration.error',
  RATE_LIMIT = 'integration.rate_limit',
}

export interface IntegrationEventPayload {
  name: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
