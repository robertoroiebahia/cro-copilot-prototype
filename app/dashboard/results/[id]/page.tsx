'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Analysis } from '@/lib/types/database.types';
import { createClient } from '@/utils/supabase/client';
import RecommendationCard, { type Recommendation } from '@/components/RecommendationCard';
import HeuristicsDisplay from '@/components/HeuristicsDisplay';

type NavigationSection = 'overview' | 'recommendations' | 'usage';

const LoadingState = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-600">Loading analysis details...</p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="bg-white shadow-sm border border-red-200 rounded-lg p-8 max-w-lg text-center">
      <h2 className="text-xl font-semibold text-red-700 mb-3">Something went wrong</h2>
      <p className="text-sm text-red-600">{message}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
      >
        Back to Dashboard
      </Link>
    </div>
  </div>
);

export default function AnalysisDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NavigationSection>('overview');

  const analysisId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!analysisId) {
        setError('Invalid analysis identifier.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace('/login');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (fetchError) {
        console.error('Failed to fetch analysis:', fetchError);
        setError('Unable to load this analysis. It may have been deleted or you may not have access to it.');
        setLoading(false);
        return;
      }

      if (!data || data.user_id !== user.id) {
        setError('Analysis not found or access denied.');
        setLoading(false);
        return;
      }

      setAnalysis(data as Analysis);
      setLoading(false);
    };

    loadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, supabase]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !analysis) {
    return <ErrorState message={error || 'Analysis not found.'} />;
  }

  const createdAt = new Date(analysis.created_at);
  const formattedDate = createdAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = createdAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const formatScreenshotSrc = (value?: string | null) => {
    if (!value) {
      return null;
    }
    return value.startsWith('data:image') ? value : `data:image/png;base64,${value}`;
  };

  const desktopAboveFoldSrc = formatScreenshotSrc(analysis.screenshots?.desktopAboveFold);
  const mobileAboveFoldSrc = formatScreenshotSrc(analysis.screenshots?.mobileAboveFold);

  const domain = (() => {
    try {
      return new URL(analysis.url).hostname.replace('www.', '');
    } catch {
      return analysis.url;
    }
  })();

  const navigationItems = [
    {
      id: 'overview' as NavigationSection,
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'recommendations' as NavigationSection,
      label: 'CRO Recommendations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      id: 'usage' as NavigationSection,
      label: 'Usage',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">{/* pt-16 accounts for fixed nav */}
      {/* Page Header - Compact & Clean */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
          </div>

          {/* Analysis Info */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Domain & URL */}
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {domain}
                </h1>
                {/* Status Badge */}
                <span
                  className={`flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full ${
                    analysis.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : analysis.status === 'processing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {analysis.status}
                </span>
              </div>

              {/* URL Link */}
              <a
                href={analysis.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline max-w-full truncate group"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="truncate">{analysis.url}</span>
              </a>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* LLM Badge */}
              {analysis.llm && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-200">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-sm font-medium text-purple-800">
                    {analysis.llm === 'gpt' ? 'GPT-5' : 'Claude 4.5'}
                  </span>
                </div>
              )}

              {/* Date */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs - Sticky */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="flex overflow-x-auto scrollbar-hide">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex-shrink-0 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeSection === item.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar - Fixed position accounting for nav */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-1">{/* top-24 = 16 (nav) + 8 (spacing) */}
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Summary Section */}
                {analysis.summary && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm p-8 border border-blue-100">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Analysis Summary</h2>
                        <p className="text-gray-800 text-base leading-relaxed mb-4">
                          {analysis.summary.headline}
                        </p>
                        <div className="flex gap-3">
                          <span className="text-xs px-3 py-1.5 bg-white text-gray-700 rounded-full font-medium border border-gray-200">
                            Tone: {analysis.summary.diagnosticTone}
                          </span>
                          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                            analysis.summary.confidence === 'high'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : analysis.summary.confidence === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {analysis.summary.confidence} confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Heuristics Display */}
                {analysis.summary?.heuristics && (
                  <HeuristicsDisplay heuristics={analysis.summary.heuristics} />
                )}

                {/* Context - Collapsible */}
                <details className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2 font-semibold text-gray-900">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Context
                  </summary>
                  <div className="px-6 pb-6 pt-2">
                    <dl className="space-y-4">
                      <div>
                        <dt className="text-sm text-gray-600 mb-1">Traffic Source</dt>
                        <dd className="text-base font-medium text-gray-900 px-3 py-2 bg-gray-50 rounded border border-gray-200">
                          {analysis.context.trafficSource}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-600 mb-1">Product Type</dt>
                        <dd className="text-base font-medium text-gray-900 px-3 py-2 bg-gray-50 rounded border border-gray-200">
                          {analysis.context.productType || 'Not specified'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-600 mb-1">Price Point</dt>
                        <dd className="text-base font-medium text-gray-900 px-3 py-2 bg-gray-50 rounded border border-gray-200">
                          {analysis.context.pricePoint || 'Not specified'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </details>

                {/* Hero Snapshot - Collapsible */}
                {analysis.screenshots && (
                  <details className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2 font-semibold text-gray-900">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Hero Snapshot
                    </summary>
                    <div className="px-6 pb-6 pt-2">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18M3 8h18M3 13h18M3 18h18" />
                            </svg>
                            Desktop - Above the Fold
                          </h4>
                          {desktopAboveFoldSrc ? (
                            <img
                              src={desktopAboveFoldSrc}
                              alt="Desktop Above Fold"
                              className="w-full border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                            />
                          ) : (
                            <div className="w-full h-48 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                              Desktop screenshot unavailable
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Mobile - Above the Fold
                          </h4>
                          {mobileAboveFoldSrc ? (
                            <img
                              src={mobileAboveFoldSrc}
                              alt="Mobile Above Fold"
                              className="w-full border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                            />
                          ) : (
                            <div className="w-full h-48 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                              Mobile screenshot unavailable
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {activeSection === 'recommendations' && (
              <div className="space-y-6">
                {analysis.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 ? (
                  <>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">CRO Recommendations</h2>
                      <p className="text-sm text-gray-600">
                        Actionable test cards ranked by impact. Each card represents a testable hypothesis with clear business metrics.
                      </p>
                    </div>

                    <div className="space-y-6">
                      {(analysis.recommendations as unknown as Recommendation[]).map((rec: Recommendation, index: number) => (
                        <RecommendationCard
                          key={rec.id || index}
                          recommendation={rec}
                          index={index}
                          analysisId={analysis.id}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">No recommendations available for this analysis.</p>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'usage' && analysis.usage && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <dt className="text-sm text-gray-600 mb-2">Total Tokens</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {analysis.usage.totalTokens?.toLocaleString() || 0}
                    </dd>
                  </div>
                  <div className="text-center">
                    <dt className="text-sm text-gray-600 mb-2">Vision Tokens</dt>
                    <dd className="text-2xl font-bold text-blue-600">
                      {((analysis.usage.visionInputTokens || 0) +
                        (analysis.usage.visionOutputTokens || 0)).toLocaleString()}
                    </dd>
                  </div>
                  <div className="text-center">
                    <dt className="text-sm text-gray-600 mb-2">Analysis Tokens</dt>
                    <dd className="text-2xl font-bold text-purple-600">
                      {((analysis.usage.analysisInputTokens || 0) +
                        (analysis.usage.analysisOutputTokens || 0)).toLocaleString()}
                    </dd>
                  </div>
                  <div className="text-center">
                    <dt className="text-sm text-gray-600 mb-2">Estimated Cost</dt>
                    <dd className="text-2xl font-bold text-green-600">
                      ${(analysis.usage.estimatedCost || 0).toFixed(4)}
                    </dd>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const formatScore = (value: number) => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1).replace(/\.0$/, '');
};

function renderAnalysisValue(value: any, key?: string): ReactElement {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">Not provided</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (typeof value === 'string') {
    if (key === 'priority' || key === 'status' || key === 'confidence') {
      const colorMap: Record<string, string> = {
        P0: 'bg-red-100 text-red-800 ring-1 ring-red-200',
        P1: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
        P2: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
        pass: 'bg-green-100 text-green-800 ring-1 ring-green-200',
        risk: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
        fail: 'bg-red-100 text-red-800 ring-1 ring-red-200',
        high: 'bg-red-100 text-red-800 ring-1 ring-red-200',
        medium: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
        low: 'bg-green-100 text-green-800 ring-1 ring-green-200',
        optimistic: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
        direct: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200',
        urgent: 'bg-red-100 text-red-800 ring-1 ring-red-200',
      };
      const colorClass = colorMap[value] || 'bg-gray-100 text-gray-800';
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
          {value}
        </span>
      );
    }

    if (value.length > 100) {
      return <p className="text-sm text-gray-700 leading-relaxed">{value}</p>;
    }

    return <span className="text-sm text-gray-800">{value}</span>;
  }

  if (typeof value === 'number') {
    const display = Number.isInteger(value) ? value.toLocaleString() : Number(value.toFixed(2)).toString();
    return <span className="text-sm font-semibold text-gray-900">{display}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic text-sm">None</span>;
    }

    const firstNonNull = value.find((item) => item !== null && item !== undefined);
    if (firstNonNull && typeof firstNonNull === 'object') {
      return (
        <div className="space-y-3 mt-2">
          {value.map((item, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
              {renderAnalysisValue(item)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <ul className="list-disc list-inside space-y-1 mt-2">
        {value.map((item, idx) => (
          <li key={idx} className="text-sm text-gray-700">
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="space-y-4 mt-2">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="border-l-2 border-blue-200 pl-4">
            <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              {k.replace(/([A-Z])/g, ' $1').trim()}
            </dt>
            <dd>{renderAnalysisValue(v, k)}</dd>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm text-gray-600">{String(value)}</span>;
}

function AnalysisContent({ data }: { data: any }) {
  if (data === null || data === undefined) {
    return (
      <div className="text-sm text-gray-500 italic">
        No data available for this section.
      </div>
    );
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return <div className="space-y-2">{renderAnalysisValue(data)}</div>;
  }

  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No data available for this section.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 border border-gray-200"
        >
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <div className="ml-3.5">{renderAnalysisValue(value, key)}</div>
        </div>
      ))}
    </div>
  );
}

function AboveFoldDetails({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <AnalysisContent data={data} />;
  }

  const { score, snapshot, wins, risks, priority, ...rest } = data;
  const winsList = Array.isArray(wins) ? wins : [];
  const risksList = Array.isArray(risks) ? risks : [];
  const restEntries = Object.keys(rest || {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {typeof score === 'number' && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
            <span>Hero Score</span>
            <span className="text-lg font-bold">{formatScore(score)}</span>
          </div>
        )}
        {priority && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Priority</span>
            {renderAnalysisValue(priority, 'priority')}
          </div>
        )}
      </div>

      {snapshot && (
        <p className="text-sm text-gray-700 leading-relaxed bg-white border border-blue-100 rounded-lg p-4 shadow-sm">
          {snapshot}
        </p>
      )}

      {winsList.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">
            What’s Working
          </h4>
          <ul className="space-y-2">
            {winsList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-800">
                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {risksList.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Immediate Risks</h4>
          {risksList.map((risk, idx) => {
            if (!risk || typeof risk !== 'object') {
              return (
                <div key={idx} className="bg-white border border-red-100 rounded-lg p-4">
                  {renderAnalysisValue(risk)}
                </div>
              );
            }

            const { issue, ...riskRest } = risk;
            return (
              <div key={idx} className="bg-white border border-red-100 rounded-lg p-4 shadow-sm space-y-3">
                {issue && <h5 className="text-sm font-semibold text-gray-900">{issue}</h5>}
                {Object.entries(riskRest).map(([riskKey, value]) => (
                  <div key={riskKey}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {riskKey.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    {renderAnalysisValue(value, riskKey)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {restEntries.length > 0 && <AnalysisContent data={rest} />}
    </div>
  );
}

function BelowFoldDetails({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <AnalysisContent data={data} />;
  }

  const { storyFlow, gaps, proofOpportunities, ctaPlacement, priority, ...rest } = data;
  const gapList = Array.isArray(gaps) ? gaps : [];
  const proofList = Array.isArray(proofOpportunities) ? proofOpportunities : [];
  const restEntries = Object.keys(rest || {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {priority && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Priority</span>
            {renderAnalysisValue(priority, 'priority')}
          </div>
        )}
      </div>

      {storyFlow && (
        <p className="text-sm text-gray-700 leading-relaxed bg-white border border-purple-100 rounded-lg p-4 shadow-sm">
          {storyFlow}
        </p>
      )}

      {gapList.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
            Gaps to Close
          </h4>
          {gapList.map((gap, idx) => {
            if (!gap || typeof gap !== 'object') {
              return (
                <div key={idx} className="bg-white border border-orange-100 rounded-lg p-4">
                  {renderAnalysisValue(gap)}
                </div>
              );
            }

            const { layer, ...gapRest } = gap;
            return (
              <div key={idx} className="bg-white border border-orange-100 rounded-lg p-4 shadow-sm space-y-3">
                {layer && <h5 className="text-sm font-semibold text-gray-900">{layer}</h5>}
                {Object.entries(gapRest).map(([gapKey, value]) => (
                  <div key={gapKey}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {gapKey.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    {renderAnalysisValue(value, gapKey)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {proofList.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">
            Proof Opportunities
          </h4>
          {renderAnalysisValue(proofList)}
        </div>
      )}

      {ctaPlacement && typeof ctaPlacement === 'object' && (
        <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">CTA Placement</h4>
          {Object.entries(ctaPlacement).map(([ctaKey, value]) => (
            <div key={ctaKey}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {ctaKey.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              {renderAnalysisValue(value, ctaKey)}
            </div>
          ))}
        </div>
      )}

      {restEntries.length > 0 && <AnalysisContent data={rest} />}
    </div>
  );
}

function FullPageDetails({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <AnalysisContent data={data} />;
  }

  const { conversionHealth, actionPlan, copyAngles, experienceRisks, ...rest } = data;
  const plan = actionPlan && typeof actionPlan === 'object' ? actionPlan : null;
  const restEntries = Object.keys(rest || {});

  const planConfig: Array<{
    key: 'fixThisWeek' | 'launchNext' | 'watchList';
    label: string;
    accent: string;
    description: string;
  }> = [
    {
      key: 'fixThisWeek',
      label: 'Fix This Week',
      accent: 'border-red-200 bg-red-50',
      description: 'High-impact fixes to ship immediately.',
    },
    {
      key: 'launchNext',
      label: 'Launch Next',
      accent: 'border-yellow-200 bg-yellow-50',
      description: 'Tests or initiatives to schedule next.',
    },
    {
      key: 'watchList',
      label: 'Watch List',
      accent: 'border-blue-200 bg-blue-50',
      description: 'Risks to monitor after changes go live.',
    },
  ];

  return (
    <div className="space-y-6">
      {conversionHealth && typeof conversionHealth === 'object' && (
        <div className="bg-white border border-green-100 rounded-lg p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 mb-3">
            {'score' in conversionHealth && typeof conversionHealth.score === 'number' && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                <span>Conversion Health</span>
                <span className="text-lg font-bold">{formatScore(conversionHealth.score)}</span>
              </div>
            )}
            {'confidence' in conversionHealth && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-gray-500">Confidence</span>
                {renderAnalysisValue(conversionHealth.confidence, 'confidence')}
              </div>
            )}
          </div>
          {'verdict' in conversionHealth && conversionHealth.verdict && (
            <p className="text-sm text-gray-700 leading-relaxed">{conversionHealth.verdict}</p>
          )}
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Action Plan</h4>
          <div className="grid md:grid-cols-3 gap-4">
            {planConfig.map(({ key, label, accent, description }) => {
              const items = Array.isArray(plan[key]) ? plan[key] : [];
              return (
                <div key={label} className={`rounded-lg border ${accent} p-4 space-y-3`}>
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900">{label}</h5>
                    <p className="text-xs text-gray-600 mt-1">{description}</p>
                  </div>
                  {items.length > 0 ? (
                    <div className="space-y-3">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white/80 border border-white rounded-lg p-3 space-y-2 shadow-sm">
                          {item?.title && (
                            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                          )}
                          {Object.entries(item || {})
                            .filter(([childKey]) => childKey !== 'title')
                            .map(([childKey, value]) => (
                              <div key={childKey}>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                  {childKey.replace(/([A-Z])/g, ' $1').trim()}
                                </p>
                                {renderAnalysisValue(value, childKey)}
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No items captured.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Array.isArray(copyAngles) && copyAngles.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Copy Angles to Test
          </h4>
          {renderAnalysisValue(copyAngles)}
        </div>
      )}

      {Array.isArray(experienceRisks) && experienceRisks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Experience Risks
          </h4>
          {renderAnalysisValue(experienceRisks)}
        </div>
      )}

      {restEntries.length > 0 && <AnalysisContent data={rest} />}
    </div>
  );
}

function StrategicExtensionsDetails({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <AnalysisContent data={data} />;
  }

  const { audienceSegments, acquisitionContinuity, creativeFeedbackLoop, handoffNotes, ...rest } = data;
  const restEntries = Object.keys(rest || {});

  return (
    <div className="space-y-6">
      {Array.isArray(audienceSegments) && audienceSegments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Audience Segments to Personalize
          </h4>
          {renderAnalysisValue(audienceSegments)}
        </div>
      )}

      {Array.isArray(acquisitionContinuity) && acquisitionContinuity.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Acquisition Continuity Ideas
          </h4>
          {renderAnalysisValue(acquisitionContinuity)}
        </div>
      )}

      {Array.isArray(creativeFeedbackLoop) && creativeFeedbackLoop.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Creative Feedback Loop
          </h4>
          {renderAnalysisValue(creativeFeedbackLoop)}
        </div>
      )}

      {handoffNotes && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Handoff Notes
          </h4>
          {renderAnalysisValue(handoffNotes)}
        </div>
      )}

      {restEntries.length > 0 && <AnalysisContent data={rest} />}
    </div>
  );
}
