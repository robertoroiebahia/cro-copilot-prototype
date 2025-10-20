/**
 * Base Module Class
 * Foundation for all analysis modules
 */

import {
  IModule,
  ModuleConfig,
  ModuleContext,
  ModuleResult,
  ModuleHooks,
  ModuleError,
  ModuleErrorType,
} from '../types/modules';
import { Logger, createLogger, LogLevel } from '../utils/logger';
import { Cache, createCache } from '../utils/cache';

/**
 * Abstract Base Module
 * Provides common functionality for all modules
 */
export abstract class BaseModule<TInput = unknown, TOutput = unknown>
  implements IModule<TInput, TOutput>
{
  public readonly config: ModuleConfig;
  public readonly context: ModuleContext;
  public readonly hooks?: ModuleHooks;

  protected logger: Logger;
  protected cache: Cache;

  constructor(config: ModuleConfig, context?: Partial<ModuleContext>) {
    this.config = {
      priority: 100,
      dependencies: [],
      options: {},
      ...config,
    };

    // Initialize logger
    this.logger = context?.logger || createLogger({
      level: LogLevel.INFO,
      module: config.name,
    });

    // Initialize cache
    this.cache = context?.cache || createCache({
      ttl: 5 * 60 * 1000, // 5 minutes
    });

    // Set up context
    this.context = {
      logger: this.logger,
      cache: this.cache,
      config: this.config.options || {},
      ...context,
    };

    this.logger.info(`Module ${config.name} initialized`, {
      version: config.version,
      enabled: config.enabled,
    });
  }

  /**
   * Execute the module (with error handling and logging)
   */
  async execute(input: TInput): Promise<ModuleResult<TOutput>> {
    const startTime = Date.now();

    try {
      // Check if module is enabled
      if (!this.config.enabled) {
        throw new ModuleError(
          ModuleErrorType.CONFIGURATION_ERROR,
          this.config.name,
          'Module is disabled'
        );
      }

      // Run onInit hook if exists
      if (this.hooks?.onInit) {
        await this.hooks.onInit();
      }

      // Validate input
      this.logger.debug('Validating input');
      const isValid = await this.validate(input);
      if (!isValid) {
        throw new ModuleError(
          ModuleErrorType.VALIDATION_ERROR,
          this.config.name,
          'Input validation failed'
        );
      }

      // Execute main logic
      this.logger.info('Executing module');
      const data = await this.run(input);

      const duration = Date.now() - startTime;
      this.logger.info('Module execution completed', { duration });

      return {
        success: true,
        data,
        metadata: {
          duration,
          cached: false,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const moduleError =
        error instanceof ModuleError
          ? error
          : new ModuleError(
              ModuleErrorType.EXECUTION_ERROR,
              this.config.name,
              error instanceof Error ? error.message : 'Unknown error',
              error instanceof Error ? error : undefined
            );

      this.logger.error('Module execution failed', moduleError, { duration });

      // Run onError hook if exists
      if (this.hooks?.onError) {
        await this.hooks.onError(moduleError);
      }

      return {
        success: false,
        error: moduleError,
        metadata: {
          duration,
        },
      };
    }
  }

  /**
   * Execute with caching
   */
  async executeWithCache(
    input: TInput,
    cacheKey: string,
    ttl?: number
  ): Promise<ModuleResult<TOutput>> {
    const cached = this.cache.get<ModuleResult<TOutput>>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached result', { cacheKey });
      return {
        ...cached,
        metadata: {
          duration: cached.metadata?.duration || 0,
          ...cached.metadata,
          cached: true,
        },
      };
    }

    const result = await this.execute(input);
    if (result.success) {
      this.cache.set(cacheKey, result, ttl);
    }

    return result;
  }

  /**
   * Abstract methods to be implemented by subclasses
   */

  /**
   * Validate input before execution
   */
  abstract validate(input: TInput): Promise<boolean>;

  /**
   * Main execution logic
   */
  protected abstract run(input: TInput): Promise<TOutput>;

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.hooks?.onDestroy) {
      await this.hooks.onDestroy();
    }
    this.logger.info(`Module ${this.config.name} destroyed`);
  }

  /**
   * Get module metadata
   */
  getMetadata(): {
    name: string;
    version: string;
    enabled: boolean;
    dependencies: string[];
  } {
    return {
      name: this.config.name,
      version: this.config.version,
      enabled: this.config.enabled,
      dependencies: this.config.dependencies || [],
    };
  }
}

/**
 * Simple module implementation helper
 */
export function createModule<TInput, TOutput>(
  config: ModuleConfig,
  validate: (input: TInput) => Promise<boolean>,
  run: (input: TInput) => Promise<TOutput>,
  moduleHooks?: ModuleHooks
): IModule<TInput, TOutput> {
  class SimpleModule extends BaseModule<TInput, TOutput> {
    public readonly hooks?: ModuleHooks;

    constructor() {
      super(config);
      this.hooks = moduleHooks;
    }

    async validate(input: TInput): Promise<boolean> {
      return validate(input);
    }

    protected async run(input: TInput): Promise<TOutput> {
      return run(input);
    }
  }

  return new SimpleModule();
}
