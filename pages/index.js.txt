import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [funnel, setFunnel] = useState({ 
    landing: "", 
    pdp: "",
    atc: "", 
    checkout: "", 
    purchase: "" 
  });
  const [context, setContext] = useState({
    trafficSource: "mixed",
    aov: ""
  });
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    if (!url.startsWith("http")) {
      setError("Please enter a valid URL starting with http:// or https://");
      return false;
    }

    const stages = Object.values(funnel).map(Number);
    for (let i = 1; i < stages.length; i++) {
      if (stages[i] > stages[i - 1]) {
        setError("Each stage should have fewer or equal users than the previous stage");
        return false;
      }
    }

    setError("");
    return true;
  };

  const analyze = async () => {
    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, funnel, context }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();
      setInsights(data);
    } catch (err) {
      setError("Failed to analyze. Please check the URL and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDropOffs = () => {
    if (!insights) return [];
    
    const stages = ['landing', 'pdp', 'atc', 'checkout', 'purchase'];
    const stageNames = ['Landing', 'Product Page', 'Add to Cart', 'Checkout', 'Purchase'];
    const dropOffs = [];

    for (let i = 0; i < stages.length - 1; i++) {
      const current = Number(funnel[stages[i]]);
      const next = Number(funnel[stages[i + 1]]);
      
      if (current > 0) {
        const dropOffRate = ((current - next) / current * 100).toFixed(1);
        dropOffs.push({
          from: stageNames[i],
          to: stageNames[i + 1],
          rate: dropOffRate,
          lost: current - next,
          severity: dropOffRate > 70 ? 'critical' : dropOffRate > 50 ? 'high' : 'medium'
        });
      }
    }

    return dropOffs;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      High: 'bg-red-100 text-red-800 border-red-300',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      Low: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[priority] || colors.Low;
  };

  const dropOffs = calculateDropOffs();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Smart Nudge Builder 🧠
          </h1>
          <p className="text-gray-600">
            AI-powered funnel analysis for DTC brands
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Input Panel */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Analyze Your Funnel</h2>
            
            {/* URL Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Landing Page URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourstore.com/product"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Funnel Metrics */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Funnel Data
              </label>
              <div className="space-y-2">
                {[
                  { key: 'landing', label: 'Landing Page Visits' },
                  { key: 'pdp', label: 'Product Page Views' },
                  { key: 'atc', label: 'Add to Cart' },
                  { key: 'checkout', label: 'Checkout Started' },
                  { key: 'purchase', label: 'Purchases' }
                ].map(({ key, label }) => (
                  <input
                    key={key}
                    type="number"
                    placeholder={label}
                    value={funnel[key]}
                    onChange={(e) => setFunnel({ ...funnel, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ))}
              </div>
            </div>

            {/* Context */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Additional Context (Optional)
              </label>
              <select
                value={context.trafficSource}
                onChange={(e) => setContext({ ...context, trafficSource: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 mb-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mixed">Mixed Traffic</option>
                <option value="paid_social">Paid Social (FB/IG/TikTok)</option>
                <option value="paid_search">Paid Search (Google Ads)</option>
                <option value="organic">Organic (SEO)</option>
                <option value="email">Email Marketing</option>
              </select>
              
              <input
                type="number"
                placeholder="Average Order Value (e.g., 85)"
                value={context.aov}
                onChange={(e) => setContext({ ...context, aov: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={analyze}
              disabled={loading || !url || !funnel.landing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
            >
              {loading ? "Analyzing..." : "Analyze Funnel"}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            {!insights && !loading && (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="font-medium">Enter your data to see insights</p>
                  <p className="text-sm mt-2">We'll analyze your funnel and suggest improvements</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Analyzing your funnel...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take 10-15 seconds</p>
                </div>
              </div>
            )}

            {insights && dropOffs.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Funnel Visualization</h2>
                <div className="space-y-3">
                  {dropOffs.map((stage, i) => {
                    const maxValue = Number(funnel.landing);
                    const currentValue = i === 0 ? Number(funnel.landing) : Number(funnel[Object.keys(funnel)[i]]);
                    const widthPercent = (currentValue / maxValue * 100).toFixed(1);
                    
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-12 bg-blue-600 rounded-r-lg relative transition-all"
                            style={{ width: `${widthPercent}%` }}
                          >
                            <div className="absolute inset-0 flex items-center justify-between px-4 text-white text-xs md:text-sm font-medium">
                              <span>{stage.from}</span>
                              <span>{currentValue.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getSeverityColor(stage.severity)}`} />
                            <span className="text-xs text-gray-600">{stage.rate}%</span>
                          </div>
                        </div>
                        
                        {stage.lost > 0 && (
                          <div className="text-xs text-gray-500 mt-1 ml-2">
                            ↓ {stage.lost.toLocaleString()} users lost to {stage.to}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {insights.pageData && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-sm mb-2">Page Signals</h3>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>H1: {insights.pageData.h1 || "Not found"}</div>
                      <div>Reviews: {insights.pageData.hasReviews ? "✅ Found" : "❌ Missing"}</div>
                      <div>Trust Badges: {insights.pageData.hasTrustBadges ? "✅ Found" : "❌ Missing"}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Insights Cards */}
        {insights && insights.recommendations && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-4">Recommended Fixes</h2>
            
            {insights.rootCause && (
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">Root Cause Analysis</h3>
                <p className="text-blue-800 text-sm">{insights.rootCause}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.recommendations.map((rec, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(rec.priority)}`}>
                      {rec.priority} Priority
                    </span>
                    {rec.stage && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {rec.stage.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{rec.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{rec.description}</p>

                  {rec.principle && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-1">Why This Works:</p>
                      <p className="text-xs text-blue-700">{rec.principle}</p>
                    </div>
                  )}

                  {rec.before && rec.after && (
                    <div className="mb-3 space-y-2">
                      <div className="p-2 bg-red-50 rounded text-xs">
                        <span className="font-medium text-red-900">Before:</span>
                        <p className="text-red-700 mt-1">"{rec.before}"</p>
                      </div>
                      <div className="p-2 bg-green-50 rounded text-xs">
                        <span className="font-medium text-green-900">After:</span>
                        <p className="text-green-700 mt-1">"{rec.after}"</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    {rec.expectedLift && (
                      <span className="text-green-600 font-medium">
                        Expected: {rec.expectedLift}
                      </span>
                    )}
                    {rec.difficulty && (
                      <span className="text-gray-500">
                        {rec.difficulty} to implement
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {insights.quickWins && insights.quickWins.length > 0 && (
              <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">🚀 Quick Wins (Test This Week)</h3>
                <ul className="space-y-2">
                  {insights.quickWins.map((win, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                      <span className="text-green-600 font-bold">•</span>
                      <span>{win}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}