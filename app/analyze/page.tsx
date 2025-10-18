'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

type AnalysisStage =
  | 'idle'
  | 'scraping'
  | 'screenshots'
  | 'hero-analysis'
  | 'social-proof-analysis'
  | 'cta-analysis'
  | 'generating-recommendations'
  | 'complete';

interface AnalysisProgress {
  stage: AnalysisStage;
  progress: number;
  message: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [context, setContext] = useState({
    trafficSource: 'mixed',
    productType: '',
    pricePoint: ''
  });
  const [llm, setLlm] = useState<'gpt' | 'claude'>('gpt');
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [warnings, setWarnings] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLoading(false);
    setAnalysisProgress({ stage: 'idle', progress: 0, message: '' });
    setError('Analysis cancelled');
  };

  const updateProgress = (stage: AnalysisStage, progress: number, message: string) => {
    setAnalysisProgress({ stage, progress, message });
  };

  const analyze = async () => {
    setLoading(true);
    setError('');
    setWarnings([]);
    setInsights(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Set 5-minute timeout (analysis can take 2-3 minutes for complex pages)
    timeoutRef.current = setTimeout(() => {
      cancelAnalysis();
      setError('Analysis timed out after 5 minutes. The analysis may have completed - please check your dashboard.');
    }, 300000);

    try {
      // Stage 1: Starting
      updateProgress('scraping', 10, 'Analyzing page content...');

      // Simulate progress updates (since we can't actually track API progress)
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev.progress >= 90) return prev;
          return { ...prev, progress: prev.progress + 2 };
        });
      }, 1000);

      // Stage 2: Screenshots
      setTimeout(() => updateProgress('screenshots', 25, 'Capturing screenshots...'), 2000);

      // Stage 3: Vision analysis
      setTimeout(() => updateProgress('hero-analysis', 40, 'Analyzing hero section...'), 5000);
      setTimeout(() => updateProgress('social-proof-analysis', 55, 'Analyzing social proof...'), 10000);
      setTimeout(() => updateProgress('cta-analysis', 70, 'Analyzing CTAs...'), 15000);

      // Stage 4: Recommendations
      setTimeout(() => updateProgress('generating-recommendations', 85, 'Generating recommendations...'), 20000);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          context,
          llm
        }),
        signal: abortControllerRef.current.signal,
      });

      clearInterval(progressInterval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (res.status === 401) {
        setError('You must be logged in to run analyses. Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      const payloadText = await res.text();
      let data: any = null;
      try {
        data = payloadText ? JSON.parse(payloadText) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const messageRaw =
          data?.error ??
          data?.details ??
          data?.message ??
          payloadText ??
          'Analysis failed';
        const message =
          typeof messageRaw === 'string' ? messageRaw : JSON.stringify(messageRaw);

        // Show helpful error messages instead of technical jargon
        if (message.includes('Anthropic API')) {
          setError('Visual analysis is temporarily unavailable. We\'ve completed a text-based analysis instead.');
          setWarnings(['Claude Vision AI is currently unavailable', 'Results may be less detailed than usual']);
        } else if (message.includes('screenshot')) {
          setError('Unable to capture screenshots. Continuing with text-based analysis.');
          setWarnings(['Screenshot capture failed', 'Visual insights unavailable']);
        } else if (message.includes('timeout') || message.includes('Timeout')) {
          setError('The page took too long to load. Please try a faster-loading page or try again later.');
        } else if (message.includes('rate limit')) {
          setError('You\'ve reached the analysis limit for this page. Please try again later or analyze a different page.');
        } else {
          setError(message);
        }

        // If we have partial data, still show it
        if (data && !data.error) {
          updateProgress('complete', 100, 'Analysis complete with warnings');
          setInsights(data);
        }
        return;
      }

      if (!data) {
        setError('Analysis completed but returned an empty response.');
        return;
      }

      if (data.error) {
        setError(data.error + (data.hint ? '\n\n' + data.hint : ''));
        return;
      }

      // Check for warnings in the response
      const responseWarnings: string[] = [];
      if (data.visionAnalysisError) {
        responseWarnings.push('Screenshot analysis unavailable: ' + data.visionAnalysisError);
      }
      if (!data.visualAnalysis || Object.keys(data.visualAnalysis).length === 0) {
        responseWarnings.push('Claude Vision analysis unavailable - showing text-based analysis only');
      }
      setWarnings(responseWarnings);

      updateProgress('complete', 100, 'Analysis complete!');
      setInsights(data);

      if (data.id) {
        console.log('Analysis saved with ID:', data.id);
      }
    } catch (err: any) {
      console.error('Analysis error:', err);

      if (err.name === 'AbortError') {
        // User cancelled - error already set
        return;
      }

      // User-friendly error messages
      if (err.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (err.message?.includes('timeout')) {
        setError('Request timed out. The page may be too slow to analyze. Please try again.');
      } else {
        setError('Something went wrong. Please try again or contact support if the issue persists.');
      }
    } finally {
      setLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white pt-16">{/* pt-16 accounts for fixed nav */}
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Form */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h2 className="text-lg font-black text-gray-900">New Analysis</h2>
              </div>

              {/* URL Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Landing Page URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourstore.com/product"
                  className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded focus:border-brand-gold focus:outline-none transition-colors duration-200 text-sm"
                />
              </div>

              {/* Context */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Context
                </label>
                <div className="space-y-3">
                  <select
                    value={context.trafficSource}
                    onChange={(e) => setContext({ ...context, trafficSource: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded focus:border-brand-gold focus:outline-none transition-colors duration-200 text-sm font-bold"
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
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded focus:border-brand-gold focus:outline-none transition-colors duration-200 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Price Point (e.g., $50-100)"
                    value={context.pricePoint}
                    onChange={(e) => setContext({ ...context, pricePoint: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded focus:border-brand-gold focus:outline-none transition-colors duration-200 text-sm"
                  />
                </div>
              </div>

              {/* LLM Selector */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Analysis Model
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLlm('gpt')}
                    className={`
                      px-4 py-3 rounded border-2 text-sm font-black transition-all duration-200
                      ${llm === 'gpt'
                        ? 'border-brand-gold bg-brand-gold/10 text-brand-gold hover:shadow-[0_0_0_2px_rgba(245,197,66,0.5)]'
                        : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-black">GPT</span>
                      <span className="text-xs opacity-75">OpenAI</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLlm('claude')}
                    className={`
                      px-4 py-3 rounded border-2 text-sm font-black transition-all duration-200
                      ${llm === 'claude'
                        ? 'border-brand-gold bg-brand-gold/10 text-brand-gold hover:shadow-[0_0_0_2px_rgba(245,197,66,0.5)]'
                        : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-black">Claude</span>
                      <span className="text-xs opacity-75">Anthropic</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-900/20 border border-red-800/40 rounded">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-red-300 whitespace-pre-line font-bold">
                      {error}
                    </div>
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={analyze}
                disabled={loading || !url}
                className="w-full bg-black hover:bg-brand-gold disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 text-white hover:text-black font-black py-3 px-6 rounded transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-brand-gold" viewBox="0 0 24 24">
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
                    href={`/dashboard/results/${insights.id}`}
                    className="text-sm text-brand-gold hover:text-brand-gold/80 hover:underline font-bold transition-colors duration-200"
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
              <div className="bg-gray-50 rounded border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[600px]">
                <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">
                  Ready to Optimize Your Landing Page
                </h3>
                <p className="text-sm text-gray-600 text-center max-w-md font-bold">
                  Enter your landing page URL and optional context to get AI-powered insights and CRO recommendations
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-gray-50 rounded border border-gray-200 p-8">
                {/* Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-black text-gray-900 mb-2">
                    Analyzing your landing page...
                  </h3>
                  <p className="text-sm text-gray-600 font-bold">
                    {analysisProgress.message || 'Starting analysis...'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-700">Progress</span>
                    <span className="text-xs font-black text-brand-gold">
                      {analysisProgress.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden border border-gray-300">
                    <div
                      className="bg-brand-gold h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${analysisProgress.progress}%` }}
                    />
                  </div>
                </div>

                {/* Stage List */}
                <div className="space-y-4 mb-8">
                  {/* Scraping Stage */}
                  <div className="flex items-center gap-3">
                    {analysisProgress.stage === 'scraping' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-brand-gold flex-shrink-0" />
                    ) : analysisProgress.progress > 10 ? (
                      <svg className="w-5 h-5 text-brand-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${analysisProgress.progress > 10 ? 'text-gray-900 font-black' : 'text-gray-500 font-bold'}`}>
                      Analyzing page content...
                    </span>
                  </div>

                  {/* Screenshots Stage */}
                  <div className="flex items-center gap-3">
                    {analysisProgress.stage === 'screenshots' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-brand-gold flex-shrink-0" />
                    ) : analysisProgress.progress > 25 ? (
                      <svg className="w-5 h-5 text-brand-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${analysisProgress.progress > 25 ? 'text-gray-900 font-black' : 'text-gray-500 font-bold'}`}>
                      Capturing screenshots...
                    </span>
                  </div>

                  {/* Hero Analysis Stage */}
                  <div className="flex items-center gap-3">
                    {analysisProgress.stage === 'hero-analysis' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-brand-gold flex-shrink-0" />
                    ) : analysisProgress.progress > 40 ? (
                      <svg className="w-5 h-5 text-brand-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${analysisProgress.progress > 40 ? 'text-gray-900 font-black' : 'text-gray-500 font-bold'}`}>
                      Analyzing hero section...
                    </span>
                  </div>

                  {/* Social Proof Analysis Stage */}
                  <div className="flex items-center gap-3">
                    {analysisProgress.stage === 'social-proof-analysis' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-brand-gold flex-shrink-0" />
                    ) : analysisProgress.progress > 55 ? (
                      <svg className="w-5 h-5 text-brand-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${analysisProgress.progress > 55 ? 'text-gray-900 font-black' : 'text-gray-500 font-bold'}`}>
                      Analyzing social proof...
                    </span>
                  </div>

                  {/* CTA Analysis Stage */}
                  <div className="flex items-center gap-3">
                    {analysisProgress.stage === 'cta-analysis' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-brand-gold flex-shrink-0" />
                    ) : analysisProgress.progress > 70 ? (
                      <svg className="w-5 h-5 text-brand-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${analysisProgress.progress > 70 ? 'text-gray-900 font-black' : 'text-gray-500 font-bold'}`}>
                      Analyzing CTAs...
                    </span>
                  </div>

                  {/* Generating Recommendations Stage */}
                  <div className="flex items-center gap-3">
                    {analysisProgress.stage === 'generating-recommendations' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-brand-gold flex-shrink-0" />
                    ) : analysisProgress.progress > 85 ? (
                      <svg className="w-5 h-5 text-brand-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${analysisProgress.progress > 85 ? 'text-gray-900 font-black' : 'text-gray-500 font-bold'}`}>
                      Generating recommendations...
                    </span>
                  </div>
                </div>

                {/* Cancel Button */}
                <div className="flex justify-center">
                  <button
                    onClick={cancelAnalysis}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-transparent hover:bg-brand-gold text-black text-sm font-black rounded border-2 border-black hover:border-brand-gold transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Analysis
                  </button>
                </div>
              </div>
            )}

            {insights && (
              <div className="space-y-6">
                {/* Success Banner */}
                <div className="bg-brand-gold/10 border border-brand-gold/40 rounded p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-brand-gold">Analysis Complete!</h3>
                      <p className="text-sm text-gray-700 mt-1 font-bold">
                        Your analysis has been saved.{' '}
                        <Link href={`/dashboard/results/${insights.id}`} className="underline font-black text-brand-gold hover:text-brand-gold/80 transition-colors duration-200">
                          View full details in dashboard
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warnings Banner */}
                {warnings.length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-800/40 rounded p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-sm font-black text-yellow-400">Partial Analysis</h3>
                        <p className="text-sm text-yellow-300 mt-1 font-bold">
                          Analysis completed with some limitations:
                        </p>
                        <ul className="mt-2 space-y-1">
                          {warnings.map((warning, index) => (
                            <li key={index} className="text-sm text-yellow-300 flex items-start gap-2 font-bold">
                              <span className="text-yellow-400">•</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Preview */}
                {insights.summary && (
                  <div className="bg-gray-50 rounded border border-gray-200 p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-brand-gold rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-brand-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-base font-black text-gray-900 mb-2">Quick Summary</h2>
                        <p className="text-gray-700 text-sm leading-relaxed font-bold">
                          {insights.summary.headline}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CTA to view full analysis */}
                <div className="bg-gray-50 rounded border border-gray-200 p-8 text-center">
                  <h3 className="text-lg font-black text-gray-900 mb-2">
                    Want to see the full analysis?
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 font-bold">
                    View detailed insights, screenshots, roadmap, and actionable recommendations
                  </p>
                  <Link
                    href={`/dashboard/results/${insights.id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black font-black rounded hover:shadow-[0_0_0_2px_rgba(245,197,66,0.5)] transition-all duration-200"
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
