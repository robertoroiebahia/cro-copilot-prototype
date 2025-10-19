import { NextRequest, NextResponse } from 'next/server';
import { getFirecrawlClient } from '@/lib/services';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Screenshot API (Migrated to Firecrawl)
 * Captures mobile screenshots using Firecrawl instead of Playwright
 */
export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { url } = body as { url?: string };

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const firecrawl = getFirecrawlClient();

    // Use Firecrawl to capture screenshot
    const result = await firecrawl.scrape(url, {
      formats: ['screenshot'],
      mobile: true,
      waitFor: 2000,
      onlyMainContent: true,
    });

    if (!result.success || !result.data?.screenshot) {
      throw new Error('Failed to capture screenshot');
    }

    // Return in the same format as before for compatibility
    return NextResponse.json({
      url,
      capturedAt: new Date().toISOString(),
      mobile: {
        fullPage: `data:image/png;base64,${result.data.screenshot}`,
      },
    });
  } catch (error: any) {
    const message: string = error?.message || 'Failed to capture screenshots';

    if (
      message.includes('Invalid URL') ||
      message.includes('protocol must')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (message.includes('Timed out') || message.includes('timeout')) {
      return NextResponse.json({ error: message }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Screenshot service is ready',
    timestamp: new Date().toISOString(),
  });
}
