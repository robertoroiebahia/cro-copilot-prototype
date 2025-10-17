import { NextRequest, NextResponse } from 'next/server';
import { ScreenshotService } from '../../../lib/screenshot-service';
import {
  analyzeAboveFold,
  VisionAnalysisError,
  VisionAnalysisResult,
} from '../../../lib/vision-analysis';

export const runtime = 'nodejs';
export const maxDuration = 60;

const screenshotService = new ScreenshotService();

type RequestBody = {
  url?: string;
  desktopImageBase64?: string;
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
    desktopImageBase64,
    mobileImageBase64,
    blockPatterns,
    waitForNetworkIdle,
  } = body ?? {};

  if (!url && (!desktopImageBase64 || !mobileImageBase64)) {
    return NextResponse.json(
      { error: 'Provide either a URL or both desktopImageBase64 and mobileImageBase64 values.' },
      { status: 400 },
    );
  }

  try {
    let desktop = desktopImageBase64;
    let mobile = mobileImageBase64;
    let screenshots:
      | {
          capturedAt: string;
          desktop: { aboveFold: string; fullPage: string };
          mobile: { aboveFold: string; fullPage: string };
        }
      | null = null;

    if (url) {
      const capture = await screenshotService.capturePageScreenshots(url, {
        blockPatterns,
        waitForNetworkIdle,
      });

      desktop = capture.desktop.aboveFold;
      mobile = capture.mobile.aboveFold;
      screenshots = {
        capturedAt: capture.capturedAt,
        desktop: {
          aboveFold: `data:image/png;base64,${capture.desktop.aboveFold}`,
          fullPage: `data:image/png;base64,${capture.desktop.fullPage}`,
        },
        mobile: {
          aboveFold: `data:image/png;base64,${capture.mobile.aboveFold}`,
          fullPage: `data:image/png;base64,${capture.mobile.fullPage}`,
        },
      };
    }

    if (!desktop || !mobile) {
      return NextResponse.json(
        { error: 'Both desktop and mobile above-fold images are required.' },
        { status: 400 },
      );
    }

    const analysis = await analyzeAboveFold({
      desktopImageBase64: desktop,
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
