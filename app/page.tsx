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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Landing Page Optimizer</h1>
          <p className="text-slate-600">AI-powered analysis to improve your DTC landing page conversions</p>
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
                
                {/* Landing Page Summary */}
                {insights.landingPageSummary && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-3">📄 Landing Page Summary</h2>
                    <p className="text-slate-700">{insights.landingPageSummary}</p>
                  </div>
                )}

                {/* Key Issues */}
                {insights.keyIssues && insights.keyIssues.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">🔍 Key Issues Found</h2>
                    <ul className="space-y-3">
                      {(Array.isArray(insights.keyIssues) ? insights.keyIssues : []).map((issue: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="text-sm text-slate-700">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {insights.recommendations && insights.recommendations.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">🧪 Recommended Experiments</h2>
                    <div className="space-y-4">
                      {insights.recommendations.map((rec: any, i: number) => (
                        <div key={i} className="border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition">
                          <div className="flex items-start justify-between mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              rec.priority === 'High' 
                                ? 'bg-red-100 text-red-800 border border-red-300' 
                                : rec.priority === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                : 'bg-green-100 text-green-800 border border-green-300'
                            }`}>
                              {rec.priority} Priority
                            </span>
                            {rec.expectedLift && (
                              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                                {rec.expectedLift} lift
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-base mb-2 text-slate-900">{rec.title}</h3>
                          <p className="text-sm text-slate-600 mb-3">{rec.description}</p>

                          {rec.hypothesis && (
                            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <p className="text-xs font-medium text-blue-900 mb-1">Hypothesis:</p>
                              <p className="text-xs text-blue-700">{rec.hypothesis}</p>
                            </div>
                          )}

                          {rec.before && rec.after && (
                            <div className="mb-3 grid grid-cols-2 gap-3">
                              <div className="p-3 bg-red-50 rounded border border-red-100">
                                <p className="text-xs font-medium text-red-900 mb-1">Before:</p>
                                <p className="text-xs text-red-700">&ldquo;{rec.before}&rdquo;</p>
                              </div>
                              <div className="p-3 bg-green-50 rounded border border-green-100">
                                <p className="text-xs font-medium text-green-900 mb-1">After:</p>
                                <p className="text-xs text-green-700">&ldquo;{rec.after}&rdquo;</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-500">
                            {rec.difficulty && <span>Difficulty: {rec.difficulty}</span>}
                            {rec.principle && <span className="italic">{rec.principle}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messaging Opportunities */}
                {insights.messagingOpportunities && (Array.isArray(insights.messagingOpportunities) ? insights.messagingOpportunities : []).length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">💡 Messaging Opportunities</h2>
                    <ul className="space-y-2">
                      {(Array.isArray(insights.messagingOpportunities) ? insights.messagingOpportunities : []).map((opp: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-blue-600 font-bold">→</span>
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Wins & Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {insights.quickWins && (Array.isArray(insights.quickWins) ? insights.quickWins : []).length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                      <h3 className="font-semibold text-green-900 mb-3">🚀 Quick Wins</h3>
                      <ul className="space-y-2">
                        {(Array.isArray(insights.quickWins) ? insights.quickWins : []).map((win: string, i: number) => (
                          <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                            <span className="text-green-600 font-bold">✓</span>
                            <span>{win}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.croChecklist && (Array.isArray(insights.croChecklist) ? insights.croChecklist : []).length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                      <h3 className="font-semibold text-purple-900 mb-3">✅ CRO Checklist</h3>
                      <ul className="space-y-2">
                        {(Array.isArray(insights.croChecklist) ? insights.croChecklist : []).map((item: string, i: number) => (
                          <li key={i} className="text-sm text-purple-800 flex items-start gap-2">
                            <span className="text-purple-600 font-bold">□</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

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