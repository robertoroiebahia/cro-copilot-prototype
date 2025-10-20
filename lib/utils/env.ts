/**
 * Environment Variable Validation
 * Ensures all required environment variables are present
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'OPENAI_API_KEY',
] as const;

const optionalEnvVars = [
  'FIRECRAWL_API_KEY',
  'ANTHROPIC_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const;

export function validateEnv() {
  // Skip on client-side
  if (typeof window !== 'undefined') return;

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      ...missing.map((key) => `  - ${key}`),
      '',
      'Please check your .env.local file',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Warn about optional vars
  const missingOptional = optionalEnvVars.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn('⚠️  Optional environment variables not set:');
    missingOptional.forEach((key) => console.warn(`  - ${key}`));
  }

  console.log('✅ All required environment variables present');
}

/**
 * Get environment variable with type safety
 */
export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];

  if (!value && !fallback) {
    throw new Error(`Environment variable ${key} is not set`);
  }

  return value || fallback || '';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}
