/**
 * Memory Cache
 * Simple in-memory caching with TTL support
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  onEvict?: (key: string, value: unknown) => void;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Cache Class
 */
export class Cache {
  private store: Map<string, CacheEntry<any>>;
  private options: Required<CacheOptions>;
  private stats: { hits: number; misses: number };

  constructor(options: CacheOptions = {}) {
    this.store = new Map();
    this.options = {
      ttl: options.ttl || 5 * 60 * 1000, // Default 5 minutes
      maxSize: options.maxSize || 1000,
      onEvict: options.onEvict || (() => {}),
    };
    this.stats = { hits: 0, misses: 0 };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict oldest if at max size
    if (this.store.size >= this.options.maxSize && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.delete(oldestKey);
      }
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + (ttl || this.options.ttl),
    };

    this.store.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (entry) {
      this.options.onEvict(key, entry.value);
    }
    return this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.forEach((entry, key) => {
      this.options.onEvict(key, entry.value);
    });
    this.store.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.store.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Get or compute value
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Wrap a function with caching
   */
  wrap<Args extends any[], R>(
    fn: (...args: Args) => Promise<R>,
    keyFn: (...args: Args) => string,
    ttl?: number
  ): (...args: Args) => Promise<R> {
    return async (...args: Args): Promise<R> => {
      const key = keyFn(...args);
      return this.getOrSet(key, () => fn(...args), ttl);
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.store.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.delete(key));
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    // Run cleanup every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Get cache entries (for debugging)
   */
  entries(): Array<{ key: string; value: any; expiresAt: number }> {
    const entries: Array<{ key: string; value: any; expiresAt: number }> = [];
    this.store.forEach((entry, key) => {
      entries.push({
        key,
        value: entry.value,
        expiresAt: entry.expiresAt,
      });
    });
    return entries;
  }
}

/**
 * Create a cache instance
 */
export function createCache(options?: CacheOptions): Cache {
  return new Cache(options);
}

/**
 * Default cache instance
 */
export const cache = createCache();
