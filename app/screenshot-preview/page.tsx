/* eslint-disable @next/next/no-img-element */
'use client';

import { FormEvent, useMemo, useState } from 'react';

type ScreenshotPayload = {
  url: string;
  capturedAt: string;
  mobile: {
    fullPage: string;
  };
};

export default function ScreenshotPreviewPage() {
  const [url, setUrl] = useState('');
  const [blockPatterns, setBlockPatterns] = useState('');
  const [waitForNetworkIdle, setWaitForNetworkIdle] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ScreenshotPayload | null>(null);

  const parsedPatterns = useMemo(() => {
    return blockPatterns
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [blockPatterns]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!url.trim()) {
      setError('Please enter a URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setPayload(null);

    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          blockPatterns: parsedPatterns.length ? parsedPatterns : undefined,
          waitForNetworkIdle,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as ScreenshotPayload;
      setPayload(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch screenshots');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Screenshot Preview</h1>
        <p className="mt-2 text-sm text-slate-600">
          Submit a URL to capture desktop and mobile screenshots through the API. Data is returned
          as Base64 images and rendered below for quick verification.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Target URL</span>
          <input
            type="url"
            className="rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />
        </label>

        <div className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <p className="font-medium">Using Firecrawl API</p>
          <p className="mt-1 text-xs text-blue-600">
            Screenshots are captured using Firecrawl's serverless screenshot service in mobile viewport.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-fit items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? 'Capturing…' : 'Capture screenshots'}
        </button>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>

      {payload && (
        <section className="grid gap-8">
          <header className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-800">Result</h2>
            <p className="text-sm text-slate-600">
              Captured at {new Date(payload.capturedAt).toLocaleString()} for{' '}
              <span className="font-medium">{payload.url}</span>
            </p>
          </header>

          <div className="grid gap-8">
            <figure className="grid gap-3">
              <figcaption className="text-sm font-medium text-slate-600">Mobile Full Page</figcaption>
              <ImageFrame src={payload.mobile.fullPage} alt="Mobile full-page screenshot" tall />
            </figure>
          </div>
        </section>
      )}
    </main>
  );
}

type ImageFrameProps = {
  src: string;
  alt: string;
  tall?: boolean;
};

function ImageFrame({ src, alt, tall = false }: ImageFrameProps) {
  return (
    <div className="overflow-auto rounded border border-slate-200 bg-slate-50 p-2 shadow-inner">
      <img
        src={src}
        alt={alt}
        className={`mx-auto ${tall ? 'max-h-[600px]' : 'max-h-[320px]'} w-auto`}
      />
    </div>
  );
}
