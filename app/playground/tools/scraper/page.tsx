'use client';

import { useState } from 'react';

interface AnalyzerResult {
  raw: any;
  formatted: string;
  html: string;
  error: string | null;
  executionTime: number;
}

interface TestResults {
  cheerio: AnalyzerResult;
  playwright: AnalyzerResult;
  playwrightAdvanced: AnalyzerResult;
}

type ScraperType = 'cheerio' | 'playwright' | 'playwrightAdvanced';

export default function ScraperToolPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [activeTab, setActiveTab] = useState<ScraperType>('cheerio');
  const [viewMode, setViewMode] = useState<'raw' | 'formatted' | 'html' | 'screenshots'>('formatted');

  const testScrapers = async () => {
    if (!url) return;

    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/playground/tools/scraper/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error testing scrapers: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (result: AnalyzerResult) => {
    if (result.error) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Failed</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Success</span>;
  };

  const getExecutionTimeBadge = (time: number) => {
    const color = time < 3000 ? 'blue' : time < 10000 ? 'yellow' : 'orange';
    return (
      <span className={`px-2 py-1 text-xs font-medium bg-${color}-100 text-${color}-800 rounded`}>
        {(time / 1000).toFixed(2)}s
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Scraper Testing Tool
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            Compare 5 different scraping approaches and analyze their output
          </p>

          {/* URL Input */}
          <div className="flex gap-3">
            <input
              type="url"
              placeholder="Enter URL to test (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
            <button
              onClick={testScrapers}
              disabled={loading || !url}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Testing...' : 'Test All Scrapers'}
            </button>
          </div>

          {loading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Running all 3 scrapers (30 second timeout)...</span>
              </div>
              <p className="text-sm text-gray-500 ml-7">
                Testing: Cheerio (static), Playwright (browser), Playwright Advanced (comprehensive)
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-t-lg shadow-sm border-t border-x border-gray-200">
              <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-hide">
                <button
                  onClick={() => setActiveTab('cheerio')}
                  className={`flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'cheerio'
                      ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <span>Cheerio (Current)</span>
                    {getStatusBadge(results.cheerio)}
                    {!results.cheerio.error && getExecutionTimeBadge(results.cheerio.executionTime)}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('playwright')}
                  className={`flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'playwright'
                      ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <span>Playwright</span>
                    {getStatusBadge(results.playwright)}
                    {!results.playwright.error && getExecutionTimeBadge(results.playwright.executionTime)}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('playwrightAdvanced')}
                  className={`flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'playwrightAdvanced'
                      ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <span>Playwright Advanced</span>
                    {getStatusBadge(results.playwrightAdvanced)}
                    {!results.playwrightAdvanced.error && getExecutionTimeBadge(results.playwrightAdvanced.executionTime)}
                  </div>
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex justify-end p-4 bg-gray-50 border-b border-gray-200">
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    onClick={() => setViewMode('formatted')}
                    className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                      viewMode === 'formatted'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Formatted (AI Input)
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-4 py-2 text-sm font-medium border-t border-b ${
                      viewMode === 'raw'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Raw JSON
                  </button>
                  <button
                    onClick={() => setViewMode('html')}
                    className={`px-4 py-2 text-sm font-medium border-t border-b ${
                      viewMode === 'html'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Raw HTML
                  </button>
                  {(results[activeTab].raw?.screenshots?.aboveFold || results[activeTab].raw?.screenshots?.fullPage) && (
                    <button
                      onClick={() => setViewMode('screenshots')}
                      className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                        viewMode === 'screenshots'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Screenshots
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-b-lg shadow-sm border-x border-b border-gray-200 p-6">
              {results[activeTab].error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-red-900 font-semibold mb-2">Error</h3>
                  <p className="text-red-700 text-sm mb-3">{results[activeTab].error}</p>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600 font-medium">Troubleshooting Tips</summary>
                    <div className="mt-2 space-y-1 text-red-800">
                      <p>• Make sure Playwright is installed: <code className="bg-red-100 px-1 rounded">npx playwright install chromium</code></p>
                      <p>• Check that the URL is accessible and valid</p>
                      <p>• Check terminal/console for detailed error logs</p>
                    </div>
                  </details>
                </div>
              ) : (
                <div>
                  {viewMode === 'formatted' ? (
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                      {results[activeTab].formatted}
                    </pre>
                  ) : viewMode === 'raw' ? (
                    <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                      {JSON.stringify(results[activeTab].raw, null, 2)}
                    </pre>
                  ) : viewMode === 'html' ? (
                    <pre className="bg-gray-900 text-orange-400 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                      {results[activeTab].html}
                    </pre>
                  ) : (
                    <div className="space-y-4">
                      {results[activeTab].raw?.screenshots?.aboveFold && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Above the fold</h4>
                          <img
                            alt="Above the fold"
                            className="border border-gray-200 rounded max-w-full h-auto"
                            src={`data:image/jpeg;base64,${results[activeTab].raw.screenshots.aboveFold}`}
                          />
                        </div>
                      )}
                      {results[activeTab].raw?.screenshots?.fullPage && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Full page</h4>
                          <img
                            alt="Full page"
                            className="border border-gray-200 rounded max-w-full h-auto"
                            src={`data:image/jpeg;base64,${results[activeTab].raw.screenshots.fullPage}`}
                          />
                        </div>
                      )}
                      {!results[activeTab].raw?.screenshots && (
                        <p className="text-gray-600 text-sm">No screenshots available for this analyzer.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comparison Summary */}
            <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Comparison Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {(['cheerio', 'playwright', 'playwrightAdvanced'] as const).map((scraper) => (
                  <div key={scraper} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 capitalize">{scraper}</h3>
                    {results[scraper].error ? (
                      <p className="text-red-600 text-sm">Failed to scrape</p>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Headlines:</span>
                          <span className="font-medium">{results[scraper].raw?.headlines?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">CTAs:</span>
                          <span className="font-medium">{results[scraper].raw?.ctas?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Form Fields:</span>
                          <span className="font-medium">{results[scraper].raw?.formFields || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reviews:</span>
                          <span className="font-medium">{results[scraper].raw?.hasReviews ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time:</span>
                          <span className="font-medium">{(results[scraper].executionTime / 1000).toFixed(2)}s</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Info */}
        {!results && !loading && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="text-indigo-900 font-semibold mb-2">How to use</h3>
            <ul className="text-indigo-800 text-sm space-y-1 list-disc list-inside">
              <li><strong>Cheerio:</strong> Lightweight HTML parser. Fast but doesn't render JavaScript. Good for static sites.</li>
              <li><strong>Playwright:</strong> Modern browser automation. Renders JavaScript, captures dynamic content.</li>
              <li><strong>Playwright Advanced:</strong> Comprehensive UX analysis with metrics, friction detection, and conversion scoring.</li>
            </ul>
            <p className="text-indigo-800 text-sm mt-3">
              Enter a URL above and click "Test All Scrapers" to compare performance and results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
