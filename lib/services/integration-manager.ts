/**
 * Integration Manager
 * Centralized management of external service integrations
 */

import {
  IntegrationConfig,
  IIntegrationManager,
  IntegrationHealth,
  IntegrationStatus,
  IntegrationEvent,
  IntegrationEventPayload,
} from '../types/integrations';
import { Logger, createLogger, LogLevel } from '../utils/logger';

/**
 * Integration Manager Class
 */
export class IntegrationManager implements IIntegrationManager {
  private integrations: Map<string, IntegrationConfig> = new Map();
  private healthCache: Map<string, IntegrationHealth> = new Map();
  private logger: Logger;
  private eventListeners: Map<IntegrationEvent, Array<(payload: IntegrationEventPayload) => void>> = new Map();

  constructor() {
    this.logger = createLogger({
      level: LogLevel.INFO,
      module: 'integration-manager',
    });
  }

  /**
   * Register an integration
   */
  register(name: string, config: IntegrationConfig): void {
    this.integrations.set(name, { ...config, name });
    this.logger.info(`Integration ${name} registered`, { enabled: config.enabled });

    this.emitEvent(IntegrationEvent.REGISTERED, {
      name,
      timestamp: new Date(),
    });
  }

  /**
   * Get integration by name
   */
  get<T extends IntegrationConfig>(name: string): T | undefined {
    return this.integrations.get(name) as T | undefined;
  }

  /**
   * Check integration health
   */
  async checkHealth(name: string): Promise<IntegrationHealth> {
    const integration = this.integrations.get(name);

    if (!integration) {
      return {
        status: IntegrationStatus.INACTIVE,
        lastChecked: new Date(),
        message: 'Integration not found',
      };
    }

    if (!integration.enabled) {
      return {
        status: IntegrationStatus.INACTIVE,
        lastChecked: new Date(),
        message: 'Integration is disabled',
      };
    }

    try {
      const startTime = Date.now();

      // Simple health check - try to access the service
      // In a real implementation, you'd make an actual API call
      const health: IntegrationHealth = {
        status: IntegrationStatus.ACTIVE,
        lastChecked: new Date(),
        latency: Date.now() - startTime,
        errorCount: 0,
      };

      this.healthCache.set(name, health);
      return health;
    } catch (error) {
      const health: IntegrationHealth = {
        status: IntegrationStatus.ERROR,
        lastChecked: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error',
        errorCount: 1,
      };

      this.healthCache.set(name, health);

      this.emitEvent(IntegrationEvent.ERROR, {
        name,
        timestamp: new Date(),
        metadata: { error },
      });

      return health;
    }
  }

  /**
   * Enable/disable integration
   */
  setEnabled(name: string, enabled: boolean): void {
    const integration = this.integrations.get(name);

    if (!integration) {
      this.logger.warn(`Integration ${name} not found`);
      return;
    }

    integration.enabled = enabled;
    this.logger.info(`Integration ${name} ${enabled ? 'enabled' : 'disabled'}`);

    this.emitEvent(
      enabled ? IntegrationEvent.ENABLED : IntegrationEvent.DISABLED,
      {
        name,
        timestamp: new Date(),
      }
    );
  }

  /**
   * Get all registered integrations
   */
  list(): string[] {
    return Array.from(this.integrations.keys());
  }

  /**
   * Get all enabled integrations
   */
  listEnabled(): string[] {
    return Array.from(this.integrations.values())
      .filter((integration) => integration.enabled)
      .map((integration) => integration.name);
  }

  /**
   * Check if integration exists
   */
  has(name: string): boolean {
    return this.integrations.has(name);
  }

  /**
   * Remove integration
   */
  unregister(name: string): boolean {
    const removed = this.integrations.delete(name);
    if (removed) {
      this.healthCache.delete(name);
      this.logger.info(`Integration ${name} unregistered`);
    }
    return removed;
  }

  /**
   * Get cached health status
   */
  getCachedHealth(name: string): IntegrationHealth | undefined {
    return this.healthCache.get(name);
  }

  /**
   * Event handling
   */
  on(event: IntegrationEvent, callback: (payload: IntegrationEventPayload) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emitEvent(event: IntegrationEvent, payload: IntegrationEventPayload): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(payload));
    }
  }

  /**
   * Get integration statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    healthy: number;
    errors: number;
  } {
    const enabled = this.listEnabled().length;
    let healthy = 0;
    let errors = 0;

    this.healthCache.forEach((health) => {
      if (health.status === IntegrationStatus.ACTIVE) {
        healthy++;
      } else if (health.status === IntegrationStatus.ERROR) {
        errors++;
      }
    });

    return {
      total: this.integrations.size,
      enabled,
      healthy,
      errors,
    };
  }
}

/**
 * Default integration manager instance
 */
export const integrationManager = new IntegrationManager();

// Register common integrations
if (process.env.FIRECRAWL_API_KEY) {
  integrationManager.register('firecrawl', {
    name: 'firecrawl',
    enabled: true,
    apiKey: process.env.FIRECRAWL_API_KEY,
    baseUrl: 'https://api.firecrawl.dev',
  });
}

if (process.env.OPENAI_API_KEY) {
  integrationManager.register('openai', {
    name: 'openai',
    enabled: true,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

if (process.env.ANTHROPIC_API_KEY) {
  integrationManager.register('anthropic', {
    name: 'anthropic',
    enabled: true,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  integrationManager.register('supabase', {
    name: 'supabase',
    enabled: true,
    baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
