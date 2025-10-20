'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AIChat } from '@/components/AIChat';

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
  const [llm, setLlm] = useState<'gpt' | 'claude'>('gpt');
  const [generateThemes, setGenerateThemes] = useState(true);
  const [generateHypotheses, setGenerateHypotheses] = useState(true);
  const [results, setResults] = useState<any>(null);
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
    setResults(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Set 3-minute timeout
    timeoutRef.current = setTimeout(() => {
      cancelAnalysis();
      setError('Analysis timed out after 3 minutes. The analysis may have completed - please check your dashboard.');
    }, 180000);

    try {
      // Realistic progress simulation based on actual stages
      updateProgress('scraping', 10, 'Fetching page content with Firecrawl...');

      // Scraping typically takes 3-5 seconds
      const scrapePromise = new Promise(resolve => setTimeout(resolve, 3000));

      const analysisPromise = fetch('/api/analyze-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          options: {
            llmProvider: llm,
            generateThemes,
            generateHypotheses
          }
        }),
        signal: abortControllerRef.current.signal,
      });

      // Update progress while waiting
      await scrapePromise;
      updateProgress('scraping', 35, 'Processing page structure...');

      // Wait a bit more then show AI analysis stage
      setTimeout(() => {
        updateProgress('generating-recommendations', 50, `Running ${llm.toUpperCase()} analysis (this may take 30-60 seconds)...`);
      }, 2000);

      // Show progress ticks during AI analysis
      const aiProgressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev.stage === 'generating-recommendations' && prev.progress < 85) {
            return { ...prev, progress: prev.progress + 3 };
          }
          return prev;
        });
      }, 2000);

      const res = await analysisPromise;

      clearInterval(aiProgressInterval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (res.status === 401) {
        setError('🔒 Authentication Required\n\nYou must be logged in to run analyses. Redirecting to login...');
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

      // Handle rate limiting with detailed feedback
      if (res.status === 429) {
        const resetTime = data?.reset ? new Date(data.reset) : null;
        const timeUntilReset = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000) : 60;
        const minutes = Math.floor(timeUntilReset / 60);
        const seconds = timeUntilReset % 60;

        setError(
          `⏱️ Rate Limit Reached\n\n` +
          `You've used ${data?.limit || 10} of ${data?.limit || 10} requests.\n` +
          `Please wait ${minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`} before trying again.`
        );
        return;
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
        } else {
          setError(message);
        }

        // If we have partial data, still show it
        if (data && !data.error) {
          updateProgress('complete', 100, 'Analysis complete with warnings');
          setResults(data);
        }
        return;
      }

      if (!data) {
        setError('Analysis completed but returned an empty response.');
        return;
      }

      if (!data.success) {
        setError(data.error || 'Analysis failed');
        return;
      }

      // Check for warnings
      const responseWarnings: string[] = [];
      if (data.insights && data.insights.length === 0) {
        responseWarnings.push('No insights extracted from the page');
      }
      if (generateThemes && (!data.themes || data.themes.length === 0)) {
        responseWarnings.push('No themes could be generated from insights');
      }
      if (generateHypotheses && (!data.hypotheses || data.hypotheses.length === 0)) {
        responseWarnings.push('No hypotheses could be generated');
      }
      setWarnings(responseWarnings);

      updateProgress('complete', 100, 'Analysis complete!');
      setResults(data);

      console.log('Analysis completed:', {
        analysisId: data.analysisId,
        insights: data.insights?.length || 0,
        themes: data.themes?.length || 0,
        hypotheses: data.hypotheses?.length || 0,
      });
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
    <div className="min-h-screen bg-white ">
      {/* Page Header */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex items-center gap-2 text-sm mb-4">
            <Link href="/dashboard" className="text-brand-text-tertiary hover:text-brand-gold transition-all duration-200 font-bold">
              Dashboard
            </Link>
            <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-brand-black font-black">New Analysis</span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-black">Page Analyzer</h1>
              <p className="text-sm text-brand-text-secondary font-medium">Get AI-powered CRO recommendations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24"
              style={{
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <h2 className="text-lg font-black text-brand-black mb-6">Configuration</h2>

              {/* URL Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-brand-text-secondary mb-2">
                  Landing Page URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourstore.com/product"
                  className="w-full px-4 py-3 bg-white border border-gray-200 text-brand-black rounded-lg focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 focus:outline-none transition-all duration-200 text-sm font-medium"
                />
              </div>

              {/* Analysis Workflow Options */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-brand-text-secondary mb-3">
                  Analysis Options
                </label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-brand-gold/50 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={generateThemes}
                        onChange={(e) => setGenerateThemes(e.target.checked)}
                        className="w-4 h-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                      />
                      <div>
                        <p className="text-sm font-bold text-brand-black">Generate Themes</p>
                        <p className="text-xs text-brand-text-tertiary">Cluster insights into themes</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-brand-gold/50 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={generateHypotheses}
                        onChange={(e) => setGenerateHypotheses(e.target.checked)}
                        className="w-4 h-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                      />
                      <div>
                        <p className="text-sm font-bold text-brand-black">Generate Hypotheses</p>
                        <p className="text-xs text-brand-text-tertiary">Create testable hypotheses from themes</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* LLM Selector */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-brand-text-secondary mb-3">
                  Analysis Model
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLlm('gpt')}
                    className={`
                      px-4 py-3 rounded-lg border-2 text-sm font-black transition-all duration-300
                      ${llm === 'gpt'
                        ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                        : 'border-gray-200 bg-white text-brand-text-secondary hover:border-brand-gold/50'
                      }
                    `}
                    style={llm === 'gpt' ? {
                      boxShadow: '0 4px 12px rgba(245, 197, 66, 0.2)'
                    } : undefined}
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
                      px-4 py-3 rounded-lg border-2 text-sm font-black transition-all duration-300
                      ${llm === 'claude'
                        ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                        : 'border-gray-200 bg-white text-brand-text-secondary hover:border-brand-gold/50'
                      }
                    `}
                    style={llm === 'claude' ? {
                      boxShadow: '0 4px 12px rgba(245, 197, 66, 0.2)'
                    } : undefined}
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
                <div className="mb-4 p-4 bg-white border border-red-200 rounded-lg"
                  style={{
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-sm text-brand-text-secondary whitespace-pre-line font-medium">
                      {error}
                    </div>
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={analyze}
                disabled={loading || !url}
                className="w-full bg-black hover:bg-brand-gold disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white hover:text-black font-black py-3.5 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                style={!loading && url ? {
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)'
                } : undefined}
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

              {results && results.analysisId && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-brand-text-tertiary font-medium">
                    Analysis ID: {results.analysisId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Content - Results */}
          <div className="lg:col-span-2">
            {!results && !loading && (
              <div className="bg-white rounded-lg border border-gray-200 p-16 flex flex-col items-center justify-center min-h-[600px]"
                style={{
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-brand-black mb-2">
                  Ready to Analyze
                </h3>
                <p className="text-sm text-brand-text-secondary text-center max-w-md font-medium">
                  Enter your landing page URL and click "Analyze Page" to get AI-powered CRO recommendations
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg border border-gray-200 p-8"
                style={{
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 rounded-full bg-brand-gold/20 animate-ping" />
                    <div className="relative w-16 h-16 bg-brand-gold rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-black animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-brand-black mb-2">
                    Analyzing Your Page
                  </h3>
                  <p className="text-sm text-brand-text-secondary font-medium">
                    {analysisProgress.message || 'Starting analysis...'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-brand-text-secondary">Progress</span>
                    <span className="text-xs font-black text-brand-gold">
                      {analysisProgress.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-brand-gold to-yellow-400 h-3 rounded-full transition-all duration-500 ease-out relative"
                      style={{ width: `${analysisProgress.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>
                </div>

                {/* Stage List - Updated for Real Pipeline */}
                <div className="space-y-4 mb-8">
                  {/* Scraping Stage */}
                  <div className="flex items-center gap-3">
                    {analysisProgress.stage === 'scraping' ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-brand-gold flex-shrink-0" />
                    ) : analysisProgress.progress > 35 ? (
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${analysisProgress.progress > 35 ? 'text-brand-black font-bold' : 'text-brand-text-tertiary font-medium'}`}>
                      Fetching page content with Firecrawl
                    </span>
                  </div>

                  {/* Generating Recommendations Stage */}
                  <div className="flex items-center gap-3">
                    {analysisProgress.stage === 'generating-recommendations' ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-brand-gold flex-shrink-0" />
                    ) : analysisProgress.progress > 85 ? (
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${analysisProgress.progress > 85 ? 'text-brand-black font-bold' : 'text-brand-text-tertiary font-medium'}`}>
                      Running AI analysis (30-60 seconds)
                    </span>
                  </div>

                  {/* Completion Indicator */}
                  <div className="flex items-center gap-3">
                    {analysisProgress.progress === 100 ? (
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${analysisProgress.progress === 100 ? 'text-brand-black font-bold' : 'text-brand-text-tertiary font-medium'}`}>
                      Saving results
                    </span>
                  </div>
                </div>

                {/* Cancel Button */}
                <div className="flex justify-center">
                  <button
                    onClick={cancelAnalysis}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-red-50 text-red-600 text-sm font-black rounded-lg border border-red-200 hover:border-red-400 transition-all duration-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Analysis
                  </button>
                </div>
              </div>
            )}

            {results && (
              <div className="space-y-6">
                {/* Success Banner */}
                <div className="bg-white border border-green-200 rounded-lg p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-black text-brand-black">Analysis Complete!</h3>
                      <p className="text-sm text-brand-text-secondary mt-1 font-medium">
                        Extracted {results.metadata?.insightCount || 0} insights
                        {results.metadata?.themeCount > 0 && `, ${results.metadata.themeCount} themes`}
                        {results.metadata?.hypothesisCount > 0 && `, ${results.metadata.hypothesisCount} hypotheses`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warnings Banner */}
                {warnings.length > 0 && (
                  <div className="bg-white border border-yellow-200 rounded-lg p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-black text-brand-black">Partial Analysis</h3>
                        <p className="text-sm text-brand-text-secondary mt-1 font-medium">
                          Analysis completed with some limitations:
                        </p>
                        <ul className="mt-3 space-y-2">
                          {warnings.map((warning, index) => (
                            <li key={index} className="text-sm text-brand-text-secondary flex items-start gap-2 font-medium">
                              <span className="text-yellow-600 font-bold">•</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Insights Section */}
                {results.insights && results.insights.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-black text-brand-black mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Atomic Insights ({results.insights.length})
                    </h2>
                    <div className="space-y-3">
                      {results.insights.slice(0, 5).map((insight: any, idx: number) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="font-bold text-sm text-brand-black">{insight.title}</h3>
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              insight.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              insight.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {insight.severity}
                            </span>
                          </div>
                          <p className="text-sm text-brand-text-secondary">{insight.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs">
                            <span className="text-brand-text-tertiary">
                              <span className="font-bold">Category:</span> {insight.category}
                            </span>
                            <span className="text-brand-text-tertiary">
                              <span className="font-bold">Confidence:</span> {insight.confidence}%
                            </span>
                          </div>
                        </div>
                      ))}
                      {results.insights.length > 5 && (
                        <p className="text-sm text-brand-text-tertiary text-center pt-2">
                          ...and {results.insights.length - 5} more insights
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Themes Section */}
                {results.themes && results.themes.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-black text-brand-black mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Themes ({results.themes.length})
                    </h2>
                    <div className="space-y-4">
                      {results.themes.map((theme: any, idx: number) => (
                        <div key={idx} className="p-4 bg-gradient-to-br from-brand-gold/5 to-yellow-50/50 rounded-lg border border-brand-gold/20">
                          <h3 className="font-black text-base text-brand-black mb-2">{theme.title}</h3>
                          <p className="text-sm text-brand-text-secondary mb-3">{theme.description}</p>
                          <div className="text-xs text-brand-text-tertiary">
                            <span className="font-bold">{theme.insights?.length || 0}</span> related insights
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hypotheses Section */}
                {results.hypotheses && results.hypotheses.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-black text-brand-black mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Testable Hypotheses ({results.hypotheses.length})
                    </h2>
                    <div className="space-y-4">
                      {results.hypotheses.map((hypothesis: any, idx: number) => (
                        <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <h3 className="font-bold text-sm text-brand-black mb-2">{hypothesis.title}</h3>
                          <p className="text-sm text-brand-text-secondary italic mb-3">"{hypothesis.hypothesis}"</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-brand-text-tertiary">
                              <span className="font-bold">Expected Lift:</span> {hypothesis.expectedImpact || 'TBD'}
                            </span>
                            <span className="text-brand-text-tertiary">
                              <span className="font-bold">Effort:</span> {hypothesis.effort || 'medium'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Chat Assistant - Context-aware when results are available */}
      <AIChat
        context={results ? {
          analysis_id: results.analysisId,
          insights: results.insights,
          themes: results.themes,
          hypotheses: results.hypotheses,
          url: url,
        } : undefined}
        onAction={(action) => {
          console.log('Suggested action:', action);
          // Handle suggested actions (create experiment, add insight, etc.)
          // This can be expanded to open modals or trigger workflows
        }}
      />
    </div>
  );
}
