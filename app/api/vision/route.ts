import { NextRequest, NextResponse } from 'next/server';
import { analyzePage } from '@/lib/services';
import {
  analyzeAboveFold,
  VisionAnalysisError,
  VisionAnalysisResult,
} from '../../../lib/vision-analysis';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RequestBody = {
  url?: string;
  mobileImageBase64?: string;
  blockPatterns?: string[];
  waitForNetworkIdle?: boolean;
};

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const {
    url,
    mobileImageBase64,
    blockPatterns,
    waitForNetworkIdle,
  } = body ?? {};

  if (!url && !mobileImageBase64) {
    return NextResponse.json(
      { error: 'Provide either a URL or mobileImageBase64 value.' },
      { status: 400 },
    );
  }

  try {
    let mobile = mobileImageBase64;
    let screenshots:
      | {
          capturedAt: string;
          mobile: { fullPage: string };
        }
      | null = null;

    if (url) {
      const pageData = await analyzePage(url);

      mobile = pageData.screenshots.mobile.fullPage;
      screenshots = {
        capturedAt: pageData.scrapedAt,
        mobile: {
          fullPage: `data:image/png;base64,${pageData.screenshots.mobile.fullPage}`,
        },
      };
    }

    if (!mobile) {
      return NextResponse.json(
        { error: 'Mobile screenshot is required.' },
        { status: 400 },
      );
    }

    const analysis = await analyzeAboveFold({
      desktopImageBase64: mobile,
      mobileImageBase64: mobile,
    });

    return NextResponse.json({
      analysis,
      screenshots,
    });
  } catch (error) {
    console.error('Vision-only analysis failed:', error);
    if (error instanceof VisionAnalysisError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Vision analysis failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST a JSON payload with either { url } or { desktopImageBase64, mobileImageBase64 } to run vision analysis.',
    example: {
      url: 'https://example.com',
      blockPatterns: ['*/analytics*'],
      waitForNetworkIdle: true,
    },
  });
}
