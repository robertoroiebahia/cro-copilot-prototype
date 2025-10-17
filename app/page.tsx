'use client';

import { useState } from 'react';

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
  const visionAnalysis = insights?.visionAnalysis;
  const visionError = insights?.visionAnalysisError;
  const screenshotPreview = insights?.screenshots;
  const summary = insights?.summary;
  const aboveTheFold = insights?.aboveTheFold;
  const belowTheFold = insights?.belowTheFold;
  const fullPageAudit = insights?.fullPage;
  const strategicExtensions = insights?.strategicExtensions;
  const roadmap = Array.isArray(insights?.roadmap) ? insights.roadmap : [];
  const croUsage = insights?.usage;

  const analyze = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, metrics, context }),
      });

      if (!res.ok) throw new Error('Analysis failed');

      const data = await res.json();
      setInsights(data);
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

  const currentRevenue = metrics.purchases && metrics.aov
    ? Number(metrics.purchases) * Number(metrics.aov)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Landing Page Optimizer</h1>
              <p className="text-slate-600">AI-powered analysis to improve your DTC landing page conversions</p>
            </div>
            <a
              href="/analysis-playground"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
            >
              Open Analysis Playground →
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Input */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-8">
              
              {/* URL Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Landing Page URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourstore.com/product"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
                />
              </div>

              {/* Landing Page Metrics */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Landing Page Performance
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Visitors (last 30 days)</label>
                    <input
                      type="number"
                      placeholder="10,000"
                      value={metrics.visitors}
                      onChange={(e) => setMetrics({ ...metrics, visitors: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Add to Carts</label>
                    <input
                      type="number"
                      placeholder="800"
                      value={metrics.addToCarts}
                      onChange={(e) => setMetrics({ ...metrics, addToCarts: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Purchases from this LP</label>
                    <input
                      type="number"
                      placeholder="250"
                      value={metrics.purchases}
                      onChange={(e) => setMetrics({ ...metrics, purchases: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Average Order Value</label>
                    <input
                      type="number"
                      placeholder="95"
                      value={metrics.aov}
                      onChange={(e) => setMetrics({ ...metrics, aov: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Context */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Context
                </label>
                <div className="space-y-3">
                  <select
                    value={context.trafficSource}
                    onChange={(e) => setContext({ ...context, trafficSource: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                    placeholder="Product Type (e.g., skincare, supplements)"
                    value={context.productType}
                    onChange={(e) => setContext({ ...context, productType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />

                  <input
                    type="text"
                    placeholder="Price Point (e.g., $50-100)"
                    value={context.pricePoint}
                    onChange={(e) => setContext({ ...context, pricePoint: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Quick Stats */}
              {lpConversionRate && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 mb-2">Quick Stats</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">LP Conversion:</span>
                      <span className="font-semibold text-slate-900">{lpConversionRate}%</span>
                    </div>
                    {atcRate && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">ATC Rate:</span>
                        <span className="font-semibold text-slate-900">{atcRate}%</span>
                      </div>
                    )}
                    {currentRevenue && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Revenue:</span>
                        <span className="font-semibold text-slate-900">${currentRevenue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={analyze}
                disabled={loading || !url || !metrics.visitors}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Analyze Landing Page'
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2">
            {!insights && !loading && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-600 font-medium mb-2">Ready to analyze your landing page</p>
                  <p className="text-sm text-slate-500">Enter your URL and metrics to get started</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 flex items-center justify-center min-h-[500px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600 font-medium mb-2">Analyzing your landing page...</p>
                  <p className="text-sm text-slate-500">This may take 15-20 seconds</p>
                </div>
              </div>
            )}

            {insights && (
              <div className="space-y-6">
                {summary && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">🧠 Growth-Hacker Summary</h2>
                        <p className="text-sm text-slate-500">
                          High-leverage synthesis rooted in copy, visuals, and behavioral hierarchy.
                        </p>
                      </div>
                      <p className="text-slate-800 text-base leading-relaxed">{summary.headline}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 uppercase tracking-wide">
                          Tone: {summary.diagnosticTone || 'n/a'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 uppercase tracking-wide">
                          Confidence: {summary.confidence || 'n/a'}
                        </span>
                        {croUsage && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1">
                            Tokens in/out: {croUsage.inputTokens}/{croUsage.outputTokens}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {(visionAnalysis || visionError) && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">👀 Above-the-Fold Vision Snapshot</h2>
                        <p className="text-sm text-slate-500">
                          GPT-4o vision read of desktop and mobile hero captures.
                        </p>
                      </div>
                      {visionAnalysis?.cost && (
                        <div className="text-xs text-slate-500 text-right">
                          <div>Prompt tokens: {visionAnalysis.cost.inputTokens}</div>
                          <div>Completion tokens: {visionAnalysis.cost.outputTokens}</div>
                          <div>Est. cost: ${visionAnalysis.cost.estimatedUsd.toFixed(4)}</div>
                        </div>
                      )}
                    </div>

                    {visionError && !visionAnalysis && (
                      <p className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {visionError}
                      </p>
                    )}

                    {screenshotPreview && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <figure className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                          <figcaption className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Desktop Above Fold
                          </figcaption>
                          <img
                            src={screenshotPreview.desktop.aboveFold}
                            alt="Desktop above-the-fold screenshot"
                            className="w-full rounded shadow-sm"
                          />
                        </figure>
                        <figure className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                          <figcaption className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Mobile Above Fold
                          </figcaption>
                          <img
                            src={screenshotPreview.mobile.aboveFold}
                            alt="Mobile above-the-fold screenshot"
                            className="w-full rounded shadow-sm"
                          />
                        </figure>
                      </div>
                    )}

                    {visionAnalysis && (
                      <div className="grid gap-6">
                        {visionAnalysis.status === 'unreadable' ? (
                          <p className="text-sm text-slate-600">
                            Vision model could not confidently interpret the screenshots. Please double-check
                            the captures or retry.
                          </p>
                        ) : (
                          <>
                            <section className="grid gap-3">
                              <h3 className="text-base font-semibold text-slate-900">Hero Summary</h3>
                              <div className="grid gap-2 text-sm text-slate-700">
                                <div>
                                  <span className="font-semibold text-slate-600">Headline:</span>{' '}
                                  {visionAnalysis.hero.headline || 'Not detected'}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-600">Subheadline:</span>{' '}
                                  {visionAnalysis.hero.subheadline || 'Not detected'}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-600">Primary CTA:</span>{' '}
                                  {visionAnalysis.hero.cta.text || 'Not detected'}
                                </div>
                                {visionAnalysis.hero.cta.styleClues.length > 0 && (
                                  <div className="text-xs text-slate-500">
                                    Style clues: {visionAnalysis.hero.cta.styleClues.join(', ')}
                                  </div>
                                )}
                                {visionAnalysis.hero.supportingElements.length > 0 && (
                                  <div className="text-xs text-slate-500">
                                    Supporting elements:{' '}
                                    {visionAnalysis.hero.supportingElements.join(', ')}
                                  </div>
                                )}
                              </div>
                            </section>

                            <section className="grid gap-3">
                              <h3 className="text-base font-semibold text-slate-900">CTA Inventory</h3>
                              {visionAnalysis.ctas.length === 0 ? (
                                <p className="text-sm text-slate-600">No calls-to-action detected above the fold.</p>
                              ) : (
                                <ul className="grid gap-2">
                                  {visionAnalysis.ctas.map((cta: any, index: number) => (
                                    <li
                                      key={`${cta.text}-${index}`}
                                      className="flex items-start justify-between gap-4 rounded border border-slate-200 px-3 py-2 text-sm text-slate-700"
                                    >
                                      <div>
                                        <div className="font-semibold text-slate-800">{cta.text || 'CTA'}</div>
                                        <div className="text-xs text-slate-500">{cta.locationHint}</div>
                                      </div>
                                      <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                        {cta.prominence} visibility
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </section>

                            <section className="grid gap-3">
                              <h3 className="text-base font-semibold text-slate-900">Trust Signals & Hierarchy</h3>
                              <div className="grid gap-2 text-sm text-slate-700">
                                <div>
                                  <span className="font-semibold text-slate-600">Trust signals:</span>{' '}
                                  {visionAnalysis.trustSignals.length > 0
                                    ? visionAnalysis.trustSignals.join(', ')
                                    : 'None spotted'}
                                </div>
                                {visionAnalysis.visualHierarchy.length > 0 && (
                                  <div>
                                    <span className="font-semibold text-slate-600">Visual hierarchy:</span>
                                    <ol className="ml-4 list-decimal text-sm text-slate-700">
                                      {visionAnalysis.visualHierarchy.map((item: string, i: number) => (
                                        <li key={i}>{item}</li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                              </div>
                            </section>

                            <section className="grid gap-3">
                              <h3 className="text-base font-semibold text-slate-900">Responsiveness & Performance</h3>
                              <div className="grid gap-2 text-sm text-slate-700">
                                <div>
                                  <span className="font-semibold text-slate-600">Responsive risk:</span>{' '}
                                  <span className="uppercase tracking-wide text-xs font-semibold text-purple-600">
                                    {visionAnalysis.responsiveness.overallRisk}
                                  </span>
                                </div>
                                {visionAnalysis.responsiveness.issues.length > 0 && (
                                  <ul className="ml-4 list-disc text-sm text-slate-700">
                                    {visionAnalysis.responsiveness.issues.map((issue: string, i: number) => (
                                      <li key={i}>{issue}</li>
                                    ))}
                                  </ul>
                                )}
                                <div>
                                  <span className="font-semibold text-slate-600">Heavy media:</span>{' '}
                                  {visionAnalysis.performanceSignals.heavyMedia ? 'Yes' : 'No'}
                                </div>
                                {visionAnalysis.performanceSignals.notes && (
                                  <p className="text-xs text-slate-500">
                                    {visionAnalysis.performanceSignals.notes}
                                  </p>
                                )}
                              </div>
                            </section>

                            <section className="grid gap-3">
                              <h3 className="text-base font-semibold text-slate-900">Desktop vs Mobile</h3>
                              {visionAnalysis.differences.flagged ? (
                                <ul className="ml-4 list-disc text-sm text-slate-700">
                                  {visionAnalysis.differences.notes.map((note: string, i: number) => (
                                    <li key={i}>{note}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-slate-600">
                                  No major differences flagged between desktop and mobile hero sections.
                                </p>
                              )}
                            </section>

                            <div className="text-xs text-slate-500">
                              Confidence: {visionAnalysis.confidence.toUpperCase()}
                              {visionAnalysis.status !== 'ok' && (
                                <span className="ml-2">({visionAnalysis.status})</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {aboveTheFold && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">1️⃣ Above the Fold — First 5 Seconds</h2>
                        <p className="text-sm text-slate-500">
                          Diagnose hook, message match, trust, and CTA strength instantly.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                        {aboveTheFold.priority || 'P1'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border ${
                          aboveTheFold.failsFirstFiveSeconds ? 'border-red-300 text-red-600' : 'border-green-300 text-green-700'
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: aboveTheFold.failsFirstFiveSeconds ? '#dc2626' : '#16a34a' }}
                        />
                        {aboveTheFold.failsFirstFiveSeconds
                          ? 'Fails initial intent snap-test'
                          : 'Passes initial intent snap-test'}
                      </span>
                    </div>

                    {Array.isArray(aboveTheFold.findings) && aboveTheFold.findings.length > 0 && (
                      <div className="space-y-3">
                        {aboveTheFold.findings.map((finding: any, index: number) => (
                          <div key={`atf-finding-${index}`} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-800">{finding.element}</span>
                              <span
                                className={`text-xs font-semibold uppercase tracking-wide ${
                                  finding.status === 'pass'
                                    ? 'text-green-600'
                                    : finding.status === 'risk'
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {finding.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">
                              <span className="font-semibold text-slate-600">Evidence:</span> {finding.evidence}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 italic">Diagnostic: {finding.diagnosticQuestion}</p>
                            <p className="mt-2 text-sm text-blue-700">
                              <span className="font-semibold">Recommendation:</span> {finding.recommendation}
                            </p>
                            {finding.abTestIdea && (
                              <p className="mt-1 text-xs text-blue-500">A/B Idea: {finding.abTestIdea}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      {aboveTheFold.headlineTest && (
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                          <h3 className="text-sm font-semibold text-slate-800 mb-2">Headline A/B Test</h3>
                          <div className="text-xs text-slate-600 space-y-1">
                            <div>
                              <span className="font-semibold">Control:</span> {aboveTheFold.headlineTest.control}
                            </div>
                            <div>
                              <span className="font-semibold">Variant:</span> {aboveTheFold.headlineTest.variant}
                            </div>
                            <div>
                              <span className="font-semibold">Hypothesis:</span> {aboveTheFold.headlineTest.hypothesis}
                            </div>
                          </div>
                        </div>
                      )}
                      {aboveTheFold.ctaTest && (
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                          <h3 className="text-sm font-semibold text-slate-800 mb-2">CTA A/B Test</h3>
                          <div className="text-xs text-slate-600 space-y-1">
                            <div>
                              <span className="font-semibold">Control:</span> {aboveTheFold.ctaTest.control}
                            </div>
                            <div>
                              <span className="font-semibold">Variant:</span> {aboveTheFold.ctaTest.variant}
                            </div>
                            <div>
                              <span className="font-semibold">Hypothesis:</span> {aboveTheFold.ctaTest.hypothesis}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 text-sm text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-600">Trust gap:</span> {aboveTheFold.trustGap}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Speed & readability:</span> {aboveTheFold.speedReadability}
                      </div>
                    </div>
                  </div>
                )}

                {belowTheFold && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">2️⃣ Below the Fold — Persuasion Arc</h2>
                        <p className="text-sm text-slate-500">
                          Ensure Pain → Dream → Solution → Proof → Offer → CTA hits in order.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                        {belowTheFold.priority || 'P1'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700">{belowTheFold.sequenceAssessment}</p>

                    {Array.isArray(belowTheFold.gaps) && belowTheFold.gaps.length > 0 && (
                      <div className="space-y-3">
                        {belowTheFold.gaps.map((gap: any, index: number) => (
                          <div key={`gap-${index}`} className="border border-slate-200 rounded-lg p-4">
                            <div className="text-sm font-semibold text-slate-800 mb-1">{gap.layer}</div>
                            <p className="text-sm text-slate-700">
                              <span className="font-semibold text-slate-600">Issue:</span> {gap.issue}
                            </p>
                            <p className="mt-1 text-sm text-blue-700">
                              <span className="font-semibold">Recommendation:</span> {gap.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {Array.isArray(belowTheFold.proofOpportunities) && belowTheFold.proofOpportunities.length > 0 && (
                      <div className="border border-blue-100 bg-blue-50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-800 mb-2">Proof Opportunities</h3>
                        <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                          {belowTheFold.proofOpportunities.map((item: string, i: number) => (
                            <li key={`proof-${i}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-600">CTA reinforcement:</span> {belowTheFold.ctaPlacementNotes}
                    </div>
                  </div>
                )}

                {fullPageAudit && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">3️⃣ Full-Page Message Architecture</h2>
                        <p className="text-sm text-slate-500">
                          Check flow, hierarchy, parity, capture, and analytics guardrails.
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                        Risk: {fullPageAudit.riskLevel || 'medium'}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-600">Message hierarchy:</span> {fullPageAudit.messageHierarchy}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Visual hierarchy:</span> {fullPageAudit.visualHierarchy}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Mobile parity:</span> {fullPageAudit.mobileParity}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Data capture:</span> {fullPageAudit.dataCapture}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Analytics readiness:</span> {fullPageAudit.analyticsReadiness}
                      </div>
                    </div>
                  </div>
                )}

                {strategicExtensions && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
                    <h2 className="text-lg font-bold text-slate-900">4️⃣ Strategic Extensions</h2>
                    <p className="text-sm text-slate-500">
                      Keep the growth loop spinning across acquisition, creative, and segmentation.
                    </p>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">Audience Segments</h3>
                        <ul className="space-y-2 text-sm text-slate-700">
                          {(strategicExtensions.audienceSegments || []).map((item: string, i: number) => (
                            <li key={`segment-${i}`} className="flex gap-2">
                              <span className="text-blue-600 font-bold">→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">Acquisition Continuity</h3>
                        <ul className="space-y-2 text-sm text-slate-700">
                          {(strategicExtensions.acquisitionContinuity || []).map((item: string, i: number) => (
                            <li key={`utm-${i}`} className="flex gap-2">
                              <span className="text-green-600 font-bold">★</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">Creative Feedback Loop</h3>
                        <ul className="space-y-2 text-sm text-slate-700">
                          {(strategicExtensions.creativeFeedbackLoop || []).map((item: string, i: number) => (
                            <li key={`creative-${i}`} className="flex gap-2">
                              <span className="text-purple-600 font-bold">✶</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {roadmap.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">📈 Prioritized Roadmap</h2>
                        <p className="text-sm text-slate-500">Sequence the highest leverage tests first.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {roadmap.map((item: any, index: number) => (
                        <div
                          key={`roadmap-${index}`}
                          className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition"
                        >
                          <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
                            <div className="flex gap-2 items-center">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  item.priority === 'P0'
                                    ? 'bg-red-100 text-red-700'
                                    : item.priority === 'P1'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.priority}
                              </span>
                              <span className="text-xs uppercase tracking-wide text-slate-500">
                                Owner: {item.owner || 'Growth'}
                              </span>
                            </div>
                            <div className="flex gap-2 text-xs text-slate-500">
                              <span>Impact: {item.impact}</span>
                              <span>Effort: {item.effort}</span>
                              {item.expectedLift && <span>Lift: {item.expectedLift}</span>}
                            </div>
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 mb-2">{item.title}</h3>
                          <p className="text-sm text-slate-700">{item.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-slate-500">
          Built for DTC growth teams
        </div>
      </div>
    </div>
  );
}
