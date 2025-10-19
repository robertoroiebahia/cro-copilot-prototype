import { NextRequest, NextResponse } from 'next/server';
import {
  ScreenshotOptions,
  ScreenshotService,
} from '../../../lib/screenshot-service';

export const runtime = 'nodejs';
export const maxDuration = 60;

const screenshotService = new ScreenshotService();

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

  const { blockPatterns, waitForNetworkIdle } = body as {
    blockPatterns?: unknown;
    waitForNetworkIdle?: unknown;
  };

  const options: ScreenshotOptions = {};

  if (Array.isArray(blockPatterns)) {
    const sanitized = blockPatterns
      .filter((pattern): pattern is string => typeof pattern === 'string')
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0);

    if (sanitized.length > 0) {
      options.blockPatterns = sanitized;
    }
  }

  if (typeof waitForNetworkIdle === 'boolean') {
    options.waitForNetworkIdle = waitForNetworkIdle;
  }

  try {
    const result = await screenshotService.capturePageScreenshots(url, options);

    return NextResponse.json({
      url,
      capturedAt: result.capturedAt,
      mobile: {
        fullPage: `data:image/png;base64,${result.mobile.fullPage}`,
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

    if (message.includes('Timed out')) {
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
