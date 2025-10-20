/**
 * Module System Types
 * Defines the structure for pluggable analysis modules
 */

import { Logger } from '../utils/logger';
import { Cache } from '../utils/cache';

/**
 * Module Configuration
 */
export interface ModuleConfig {
  name: string;
  version: string;
  enabled: boolean;
  priority?: number; // Lower runs first
  dependencies?: string[]; // Other module names this depends on
  options?: Record<string, unknown>;
}

/**
 * Module Context - Shared resources available to all modules
 */
export interface ModuleContext {
  logger: Logger;
  cache: Cache;
  config: Record<string, unknown>;
  analysisId?: string;
  userId?: string;
}

/**
 * Module Execution Result
 */
export interface ModuleResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata?: {
    duration: number;
    cached?: boolean;
    retries?: number;
    [key: string]: unknown;
  };
}

/**
 * Module Lifecycle Hooks
 */
export interface ModuleHooks {
  onInit?: () => Promise<void>;
  onDestroy?: () => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

/**
 * Base Module Interface
 * All analysis modules must implement this interface
 */
export interface IModule<TInput = unknown, TOutput = unknown> {
  config: ModuleConfig;
  context: ModuleContext;

  /**
   * Execute the module's main logic
   */
  execute(input: TInput): Promise<ModuleResult<TOutput>>;

  /**
   * Validate input before execution
   */
  validate(input: TInput): Promise<boolean>;

  /**
   * Optional lifecycle hooks
   */
  hooks?: ModuleHooks;
}

/**
 * Module Registry Entry
 */
export interface ModuleRegistryEntry {
  module: IModule;
  metadata: {
    registeredAt: Date;
    executionCount: number;
    lastExecutedAt?: Date;
    averageDuration?: number;
    successRate?: number;
  };
}

/**
 * Module Execution Options
 */
export interface ModuleExecutionOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  parallel?: boolean;
}

/**
 * Module Error Types
 */
export enum ModuleErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

/**
 * Module Error
 */
export class ModuleError extends Error {
  constructor(
    public type: ModuleErrorType,
    public moduleName: string,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ModuleError';
  }
}

/**
 * Module Pipeline - For chaining multiple modules
 */
export interface ModulePipeline<TInput = unknown, TOutput = unknown> {
  name: string;
  modules: IModule[];

  /**
   * Execute all modules in sequence
   */
  execute(input: TInput): Promise<ModuleResult<TOutput>>;

  /**
   * Execute modules in parallel
   */
  executeParallel(input: TInput): Promise<ModuleResult<TOutput>[]>;
}
