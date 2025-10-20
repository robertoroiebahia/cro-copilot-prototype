/**
 * Module Registry
 * Central registry for managing analysis modules
 */

import {
  IModule,
  ModuleRegistryEntry,
  ModuleExecutionOptions,
  ModuleResult,
  ModuleError,
  ModuleErrorType,
} from '../types/modules';
import { Logger, createLogger, LogLevel } from '../utils/logger';

/**
 * Module Registry Class
 */
export class ModuleRegistry {
  private modules: Map<string, ModuleRegistryEntry> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = createLogger({
      level: LogLevel.INFO,
      module: 'module-registry',
    });
  }

  /**
   * Register a module
   */
  register(module: IModule): void {
    const { name } = module.config;

    if (this.modules.has(name)) {
      this.logger.warn(`Module ${name} already registered, replacing`);
    }

    this.modules.set(name, {
      module,
      metadata: {
        registeredAt: new Date(),
        executionCount: 0,
      },
    });

    this.logger.info(`Module ${name} registered`, {
      version: module.config.version,
      dependencies: module.config.dependencies,
    });
  }

  /**
   * Unregister a module
   */
  unregister(name: string): boolean {
    const removed = this.modules.delete(name);
    if (removed) {
      this.logger.info(`Module ${name} unregistered`);
    }
    return removed;
  }

  /**
   * Get a module by name
   */
  get(name: string): IModule | undefined {
    const entry = this.modules.get(name);
    return entry?.module;
  }

  /**
   * Check if module exists
   */
  has(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Get all registered module names
   */
  list(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Get module metadata
   */
  getMetadata(name: string): ModuleRegistryEntry['metadata'] | undefined {
    return this.modules.get(name)?.metadata;
  }

  /**
   * Execute a module by name
   */
  async execute<TInput, TOutput>(
    name: string,
    input: TInput,
    options?: ModuleExecutionOptions
  ): Promise<ModuleResult<TOutput>> {
    const entry = this.modules.get(name);

    if (!entry) {
      throw new ModuleError(
        ModuleErrorType.CONFIGURATION_ERROR,
        name,
        `Module ${name} not found in registry`
      );
    }

    const { module } = entry;

    // Check dependencies
    if (module.config.dependencies && module.config.dependencies.length > 0) {
      for (const dep of module.config.dependencies) {
        if (!this.has(dep)) {
          throw new ModuleError(
            ModuleErrorType.DEPENDENCY_ERROR,
            name,
            `Required dependency ${dep} not found`
          );
        }
      }
    }

    // Update metadata
    entry.metadata.executionCount++;
    entry.metadata.lastExecutedAt = new Date();

    const startTime = Date.now();

    try {
      // Execute with timeout if specified
      const result = options?.timeout
        ? await this.executeWithTimeout(module as IModule<TInput, TOutput>, input, options.timeout)
        : await (module as IModule<TInput, TOutput>).execute(input);

      const duration = Date.now() - startTime;

      // Update average duration
      if (entry.metadata.averageDuration) {
        entry.metadata.averageDuration =
          (entry.metadata.averageDuration + duration) / 2;
      } else {
        entry.metadata.averageDuration = duration;
      }

      // Update success rate
      const successCount = result.success
        ? (entry.metadata.successRate || 0) * (entry.metadata.executionCount - 1) + 1
        : (entry.metadata.successRate || 0) * (entry.metadata.executionCount - 1);
      entry.metadata.successRate = successCount / entry.metadata.executionCount;

      return result;
    } catch (error) {
      this.logger.error(`Module ${name} execution failed`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute module with timeout
   */
  private async executeWithTimeout<TInput, TOutput>(
    module: IModule<TInput, TOutput>,
    input: TInput,
    timeout: number
  ): Promise<ModuleResult<TOutput>> {
    return Promise.race([
      module.execute(input),
      new Promise<ModuleResult<TOutput>>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new ModuleError(
                ModuleErrorType.TIMEOUT_ERROR,
                module.config.name,
                `Module execution timed out after ${timeout}ms`
              )
            ),
          timeout
        )
      ),
    ]);
  }

  /**
   * Execute multiple modules in sequence
   */
  async executeSequence<TInput, TOutput>(
    moduleNames: string[],
    input: TInput,
    options?: ModuleExecutionOptions
  ): Promise<ModuleResult<TOutput>[]> {
    const results: ModuleResult<TOutput>[] = [];

    for (const name of moduleNames) {
      const result = await this.execute<TInput, TOutput>(name, input, options);
      results.push(result);

      // Stop on first failure if not parallel
      if (!result.success && !options?.parallel) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple modules in parallel
   */
  async executeParallel<TInput, TOutput>(
    moduleNames: string[],
    input: TInput,
    options?: ModuleExecutionOptions
  ): Promise<ModuleResult<TOutput>[]> {
    const promises = moduleNames.map((name) =>
      this.execute<TInput, TOutput>(name, input, options)
    );

    return Promise.all(promises);
  }

  /**
   * Execute modules by priority
   */
  async executeByPriority<TInput, TOutput>(
    input: TInput,
    options?: ModuleExecutionOptions
  ): Promise<ModuleResult<TOutput>[]> {
    const sorted = Array.from(this.modules.values())
      .filter((entry) => entry.module.config.enabled)
      .sort(
        (a, b) =>
          (a.module.config.priority || 100) - (b.module.config.priority || 100)
      );

    const moduleNames = sorted.map((entry) => entry.module.config.name);
    return this.executeSequence(moduleNames, input, options);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalModules: number;
    enabledModules: number;
    totalExecutions: number;
    averageSuccessRate: number;
  } {
    let totalExecutions = 0;
    let totalSuccessRate = 0;
    let enabledCount = 0;

    this.modules.forEach((entry) => {
      totalExecutions += entry.metadata.executionCount;
      totalSuccessRate += entry.metadata.successRate || 0;
      if (entry.module.config.enabled) {
        enabledCount++;
      }
    });

    return {
      totalModules: this.modules.size,
      enabledModules: enabledCount,
      totalExecutions,
      averageSuccessRate:
        this.modules.size > 0 ? totalSuccessRate / this.modules.size : 0,
    };
  }

  /**
   * Clear all modules
   */
  clear(): void {
    this.modules.clear();
    this.logger.info('Module registry cleared');
  }
}

/**
 * Default registry instance
 */
export const registry = new ModuleRegistry();
