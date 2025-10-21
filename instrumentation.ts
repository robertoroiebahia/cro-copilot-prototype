/**
 * Next.js Instrumentation Hook
 * Called once when the server starts
 * Perfect for environment validation and initialization
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/utils/env');

    try {
      validateEnv();
    } catch (error) {
      console.error('❌ Environment validation failed');
      console.error(error);

      // In production, we want the server to fail fast
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}
