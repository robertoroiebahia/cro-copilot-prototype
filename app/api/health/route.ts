/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Checks system health and dependencies
 * Use for monitoring and uptime checks
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckResult;
    openai: CheckResult;
    anthropic: CheckResult;
    firecrawl: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single();

    const responseTime = Date.now() - start;

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is ok
      return {
        status: 'fail',
        responseTime,
        message: error.message,
      };
    }

    if (responseTime > 1000) {
      return {
        status: 'warn',
        responseTime,
        message: 'Slow response',
      };
    }

    return {
      status: 'pass',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkOpenAI(): Promise<CheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      status: 'fail',
      message: 'API key not configured',
    };
  }

  // Just check if key exists - don't make actual API call to avoid costs
  return {
    status: 'pass',
    message: 'API key configured',
  };
}

async function checkAnthropic(): Promise<CheckResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      status: 'warn',
      message: 'API key not configured (optional)',
    };
  }

  return {
    status: 'pass',
    message: 'API key configured',
  };
}

async function checkFirecrawl(): Promise<CheckResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    return {
      status: 'warn',
      message: 'API key not configured (optional)',
    };
  }

  return {
    status: 'pass',
    message: 'API key configured',
  };
}

export async function GET() {
  const start = Date.now();

  try {
    // Run all checks in parallel
    const [database, openai, anthropic, firecrawl] = await Promise.all([
      checkDatabase(),
      checkOpenAI(),
      checkAnthropic(),
      checkFirecrawl(),
    ]);

    const checks = {
      database,
      openai,
      anthropic,
      firecrawl,
    };

    // Determine overall health
    const hasFailures = Object.values(checks).some(check => check.status === 'fail');
    const hasWarnings = Object.values(checks).some(check => check.status === 'warn');

    let status: HealthCheck['status'] = 'healthy';
    if (hasFailures) {
      status = 'unhealthy';
    } else if (hasWarnings) {
      status = 'degraded';
    }

    const health: HealthCheck = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };

    // Return appropriate status code
    const statusCode = status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  }
}
