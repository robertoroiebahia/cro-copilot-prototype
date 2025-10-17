/* eslint-disable @next/next/no-img-element */
'use client';

import { FormEvent, useState } from 'react';
import type { VisionAnalysisResult } from '../../lib/vision-analysis';

type VisionResponse = {
  analysis: VisionAnalysisResult;
  screenshots?: {
    capturedAt: string;
    desktop: {
      aboveFold: string;
      fullPage: string;
    };
    mobile: {
      aboveFold: string;
      fullPage: string;
    };
  } | null;
  error?: string;
};

type FullAnalysisResponse = {
  summary?: Record<string, unknown>;
  aboveTheFold?: Record<string, unknown>;
  belowTheFold?: Record<string, unknown>;
  fullPage?: Record<string, unknown>;
  strategicExtensions?: Record<string, unknown>;
  roadmap?: Array<Record<string, unknown>>;
  visionAnalysis?: VisionAnalysisResult | null;
  visionAnalysisError?: string | null;
  screenshots?: VisionResponse['screenshots'];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
};

export default function AnalysisPlaygroundPage() {
  const [url, setUrl] = useState('');
  const [blockPatterns, setBlockPatterns] = useState('');
  const [waitForNetworkIdle, setWaitForNetworkIdle] = useState(true);

  const [visionLoading, setVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<VisionResponse | null>(null);

  const [fullLoading, setFullLoading] = useState(false);
  const [fullError, setFullError] = useState<string | null>(null);
  const [fullResult, setFullResult] = useState<FullAnalysisResponse | null>(null);

  const parsedBlockPatterns = blockPatterns
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  async function runVisionAnalysis(event?: FormEvent) {
    event?.preventDefault();
    if (!url.trim()) {
      setVisionError('Please provide a URL.');
      return;
    }

    setVisionLoading(true);
    setVisionError(null);
    setVisionResult(null);

    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          blockPatterns: parsedBlockPatterns.length ? parsedBlockPatterns : undefined,
          waitForNetworkIdle,
        }),
      });

      const data = (await response.json()) as VisionResponse;
      if (!response.ok) {
        throw new Error(data?.error || 'Vision analysis failed');
      }

      setVisionResult(data);
    } catch (error: any) {
      setVisionError(error?.message || 'Vision analysis failed');
    } finally {
      setVisionLoading(false);
    }
  }

  async function runFullAnalysis(event?: FormEvent) {
    event?.preventDefault();
    if (!url.trim()) {
      setFullError('Please provide a URL.');
      return;
    }

    setFullLoading(true);
    setFullError(null);
    setFullResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          metrics: {},
          context: {
            trafficSource: 'mixed',
          },
        }),
      });

      const data = (await response.json()) as FullAnalysisResponse;
      if (!response.ok) {
        throw new Error(data?.error || 'CRO analysis failed');
      }

      setFullResult(data);
    } catch (error: any) {
      setFullError(error?.message || 'CRO analysis failed');
    } finally {
      setFullLoading(false);
    }
  }

  function renderJson(value: unknown) {
    return (
      <pre className="overflow-auto rounded bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Analysis Playground</h1>
        <p className="text-sm text-slate-600">
          Quickly sanity-check screenshot capture, vision-only insights, and the full CRO analysis in isolation.
        </p>
      </header>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4" onSubmit={runVisionAnalysis}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Landing Page URL</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className="rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Block Patterns (optional)</span>
            <textarea
              className="min-h-[80px] rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="*/analytics*&#10;*/tracking/*"
              value={blockPatterns}
              onChange={(event) => setBlockPatterns(event.target.value)}
            />
            <span className="text-xs text-slate-500">
              One glob per line. Requests matching any pattern are aborted before screenshots.
            </span>
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={waitForNetworkIdle}
              onChange={(event) => setWaitForNetworkIdle(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Wait briefly for network idle after DOM ready
          </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={visionLoading}
                className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {visionLoading ? 'Running Vision Analysis…' : 'Run Vision Analysis'}
              </button>
              <button
                type="button"
                onClick={runFullAnalysis}
                disabled={fullLoading}
                className="inline-flex items-center justify-center rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
              >
                {fullLoading ? 'Running Full Analysis…' : 'Run Full CRO Analysis'}
              </button>
            </div>
        </form>
      </section>

      <section className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Vision Analysis Output</h2>
          <p className="text-sm text-slate-500">
            Direct response from <code className="rounded bg-slate-100 px-1 py-0.5">/api/vision</code>.
          </p>
        </header>

        {visionError && (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {visionError}
          </p>
        )}

        {visionResult && (
          <div className="grid gap-5">
            {visionResult.screenshots && (
              <div className="grid gap-4 md:grid-cols-2">
                <figure className="rounded border border-slate-200 bg-slate-50 p-3">
                  <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Desktop Above Fold
                  </figcaption>
                  <img
                    src={visionResult.screenshots.desktop.aboveFold}
                    alt="Desktop above-the-fold screenshot"
                    className="w-full rounded shadow-sm"
                  />
                </figure>

                <figure className="rounded border border-slate-200 bg-slate-50 p-3">
                  <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mobile Above Fold
                  </figcaption>
                  <img
                    src={visionResult.screenshots.mobile.aboveFold}
                    alt="Mobile above-the-fold screenshot"
                    className="w-full rounded shadow-sm"
                  />
                </figure>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Structured JSON</h3>
              {renderJson(visionResult.analysis)}
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Full CRO Analysis Output</h2>
          <p className="text-sm text-slate-500">
            Combined scraper + GPT audit from <code className="rounded bg-slate-100 px-1 py-0.5">/api/analyze</code>.
          </p>
        </header>

        {fullError && (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {fullError}
          </p>
        )}

        {fullResult && (
          <div className="grid gap-5">
            {fullResult.screenshots && (
              <div className="grid gap-4 md:grid-cols-2">
                <figure className="rounded border border-slate-200 bg-slate-50 p-3">
                  <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Desktop Above Fold
                  </figcaption>
                  <img
                    src={fullResult.screenshots.desktop.aboveFold}
                    alt="Desktop above-the-fold screenshot"
                    className="w-full rounded shadow-sm"
                  />
                </figure>

                <figure className="rounded border border-slate-200 bg-slate-50 p-3">
                  <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mobile Above Fold
                  </figcaption>
                  <img
                    src={fullResult.screenshots.mobile.aboveFold}
                    alt="Mobile above-the-fold screenshot"
                    className="w-full rounded shadow-sm"
                  />
                </figure>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Structured JSON</h3>
              {renderJson(fullResult)}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
