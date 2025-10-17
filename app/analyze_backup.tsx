'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [url, setUrl] = useState('');
  const [metrics, setMetrics] = useState({
    visitors: '',
    addToCarts: '',
    purchases: '',
    aov: ''
  });
  const [context, setContext] = useState({
    trafficSource: 'mixed',
    productType: '',
    pricePoint: ''
  });
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, metrics, context }),
      });

      if (res.status === 401) {
        setError('You must be logged in to run analyses. Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      if (!res.ok) throw new Error('Analysis failed');

      const data = await res.json();
      setInsights(data);

      // Show success message
      if (data.id) {
        console.log('Analysis saved with ID:', data.id);
      }
    } catch (err) {
      setError('Failed to analyze. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate conversion metrics
  const lpConversionRate = metrics.visitors && metrics.purchases
    ? ((Number(metrics.purchases) / Number(metrics.visitors)) * 100).toFixed(2)
    : null;

  const atcRate = metrics.visitors && metrics.addToCarts
    ? ((Number(metrics.addToCarts) / Number(metrics.visitors)) * 100).toFixed(2)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Nudge Builder</h1>
              <p className="text-sm text-gray-600 mt-1">AI-powered landing page analysis and optimization</p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">New Analysis</h2>
              </div>

              {/* URL Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Landing Page URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourstore.com/product"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              {/* Metrics */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Performance Metrics (Last 30 Days)
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Visitors</label>
                    <input
                      type="number"
                      placeholder="10,000"
                      value={metrics.visitors}
                      onChange={(e) => setMetrics({ ...metrics, visitors: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Add to Carts</label>
                    <input
                      type="number"
                      placeholder="800"
                      value={metrics.addToCarts}
                      onChange={(e) => setMetrics({ ...metrics, addToCarts: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Purchases</label>
                    <input
                      type="number"
                      placeholder="250"
                      value={metrics.purchases}
                      onChange={(e) => setMetrics({ ...metrics, purchases: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Average Order Value ($)</label>
                    <input
                      type="number"
                      placeholder="95"
                      value={metrics.aov}
                      onChange={(e) => setMetrics({ ...metrics, aov: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Context */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Context
                </label>
                <div className="space-y-3">
                  <select
                    value={context.trafficSource}
                    onChange={(e) => setContext({ ...context, trafficSource: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="mixed">Mixed Traffic</option>
                    <option value="paid_social">Paid Social (FB/IG/TikTok)</option>
                    <option value="paid_search">Paid Search (Google)</option>
                    <option value="organic">Organic Search</option>
                    <option value="email">Email Campaign</option>
                    <option value="influencer">Influencer/Affiliate</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Product Type (e.g., skincare)"
                    value={context.productType}
                    onChange={(e) => setContext({ ...context, productType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Price Point (e.g., $50-100)"
                    value={context.pricePoint}
                    onChange={(e) => setContext({ ...context, pricePoint: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Quick Stats */}
              {(lpConversionRate || atcRate) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-600 mb-2">Quick Stats</div>
                  <div className="space-y-2 text-sm">
                    {lpConversionRate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conversion Rate:</span>
                        <span className="font-semibold text-gray-900">{lpConversionRate}%</span>
                      </div>
                    )}
                    {atcRate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">ATC Rate:</span>
                        <span className="font-semibold text-gray-900">{atcRate}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={analyze}
                disabled={loading || !url || !metrics.visitors}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Analyze Page
                  </>
                )}
              </button>

              {insights && insights.id && (
                <div className="mt-4 text-center">
                  <Link
                    href={`/dashboard/${insights.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    View full analysis in dashboard →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Content - Results */}
          <div className="lg:col-span-2">
            {!insights && !loading && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[600px]">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Optimize Your Landing Page
                </h3>
                <p className="text-sm text-gray-600 text-center max-w-md">
                  Enter your landing page URL and performance metrics to get AI-powered insights and CRO recommendations
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[600px]">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Analyzing Your Landing Page
                </h3>
                <p className="text-sm text-gray-600 text-center max-w-md">
                  Running vision AI, analyzing copy, and generating CRO insights... This takes 15-30 seconds.
                </p>
              </div>
            )}

            {insights && (
              <div className="space-y-6">
                {/* Success Banner */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-green-900">Analysis Complete!</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Your analysis has been saved.{' '}
                        <Link href={`/dashboard/${insights.id}`} className="underline font-semibold">
                          View full details in dashboard
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary Preview */}
                {insights.summary && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-blue-100">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-base font-semibold text-gray-900 mb-2">Quick Summary</h2>
                        <p className="text-gray-800 text-sm leading-relaxed">
                          {insights.summary.headline}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CTA to view full analysis */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Want to see the full analysis?
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    View detailed insights, screenshots, roadmap, and actionable recommendations
                  </p>
                  <Link
                    href={`/dashboard/${insights.id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition"
                  >
                    View Full Analysis
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
