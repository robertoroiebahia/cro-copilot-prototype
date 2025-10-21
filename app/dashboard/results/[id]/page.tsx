'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Analysis } from '@/lib/types/database.types';
import type { Insight } from '@/lib/types/insights.types';
import { createClient } from '@/utils/supabase/client';

const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center ">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
      <p className="text-base text-brand-text-secondary font-bold">Loading analysis details...</p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center ">
    <div className="bg-white rounded-lg border border-red-200 p-10 max-w-lg text-center"
      style={{
        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.1)'
      }}
    >
      <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-brand-black mb-3">Something went wrong</h2>
      <p className="text-sm text-brand-text-secondary font-medium mb-6">{message}</p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
        style={{
          boxShadow: '0 4px 12px rgba(245, 197, 66, 0.3)'
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
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
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

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

      // Fetch insights for this analysis
      const { data: insightsData, error: insightsError } = await supabase
        .from('insights')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });

      if (!insightsError && insightsData) {
        setInsights(insightsData as Insight[]);
      }

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

    if (value.startsWith('data:image')) {
      return value;
    }

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    return `data:image/jpeg;base64,${value}`;
  };

  // Try both field names for backwards compatibility
  const screenshotUrl = (analysis.screenshots as any)?.full_page || analysis.screenshots?.mobileFullPage;
  const mobileFullPageSrc = formatScreenshotSrc(screenshotUrl);

  const domain = (() => {
    try {
      return new URL(analysis.url).hostname.replace('www.', '');
    } catch {
      return analysis.url;
    }
  })();

  const criticalInsights = insights.filter(i => i.priority === 'critical');
  const highPriorityInsights = insights.filter(i => i.priority === 'high');
  const avgConfidence = insights.length > 0
    ? insights.reduce((sum, i) => {
        const confScore = { high: 85, medium: 65, low: 40 };
        return sum + (confScore[i.confidence_level] || 65);
      }, 0) / insights.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              {/* Breadcrumb */}
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand-gold transition-colors mb-6 font-bold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>

              {/* Title */}
              <h1 className="text-4xl font-black text-brand-black mb-3">{domain}</h1>
              <a
                href={analysis.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-brand-gold transition-colors group"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="text-sm font-medium truncate max-w-xl">{analysis.url}</span>
              </a>

              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="bg-white rounded-lg p-4 border border-gray-300 shadow-sm">
                  <div className="text-3xl font-black text-brand-black mb-1">{insights.length}</div>
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Total Insights</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200 shadow-sm">
                  <div className="text-3xl font-black text-red-600 mb-1">{criticalInsights.length}</div>
                  <div className="text-xs font-bold text-red-700 uppercase tracking-wide">Critical Issues</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 shadow-sm">
                  <div className="text-3xl font-black text-orange-600 mb-1">{highPriorityInsights.length}</div>
                  <div className="text-xs font-bold text-orange-700 uppercase tracking-wide">High Priority</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200 shadow-sm">
                  <div className="text-3xl font-black text-green-600 mb-1">{Math.round(avgConfidence)}%</div>
                  <div className="text-xs font-bold text-green-700 uppercase tracking-wide">Avg Confidence</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button className="px-6 py-3 bg-brand-gold text-black font-black rounded-lg hover:bg-yellow-500 transition-all duration-300 shadow-lg">
                Export Report
              </button>
              <Link
                href="/insights"
                className="px-6 py-3 bg-white text-brand-black font-black rounded-lg hover:bg-gray-50 transition-all duration-300 border border-gray-300 text-center shadow-sm"
              >
                View All Insights
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Side by Side Layout */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Screenshot */}
          <div className="lg:sticky lg:top-8 lg:self-start space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-lg font-black text-white">Page Screenshot</h2>
                </div>
              </div>
              <div className="p-4 bg-gray-50">
                {mobileFullPageSrc ? (
                  <div className="relative group">
                    <img
                      src={mobileFullPageSrc}
                      alt="Page Screenshot"
                      className="w-full rounded-lg border-2 border-gray-300 cursor-pointer transition-all duration-300 group-hover:border-brand-gold group-hover:shadow-2xl"
                      onClick={() => setExpandedScreenshot(mobileFullPageSrc)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-brand-gold text-black px-4 py-2 rounded-lg font-black text-sm">
                        Click to enlarge
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-12">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-600 font-bold">No screenshot available</p>
                      <p className="text-xs text-gray-500 mt-1">Screenshot was not captured for this analysis</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Insights */}
          <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-brand-black">Key Insights</h2>
              <span className="text-sm text-brand-text-tertiary font-bold">{insights.length} found</span>
            </div>

            {insights.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <p className="text-brand-text-secondary font-bold">No insights found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="bg-white rounded-xl border-2 border-gray-200 hover:border-brand-gold hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                      className="w-full p-6 text-left"
                    >
                      <div className="flex items-start gap-4">
                        {/* Priority Badge */}
                        <div className="flex-shrink-0">
                          {insight.priority === 'critical' && (
                            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {insight.priority === 'high' && (
                            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center font-black text-white text-lg">
                              H
                            </div>
                          )}
                          {insight.priority === 'medium' && (
                            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center font-black text-white text-lg">
                              M
                            </div>
                          )}
                          {insight.priority === 'low' && (
                            <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center font-black text-white text-lg">
                              L
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="text-lg font-black text-brand-black">
                              {insight.title}
                            </h3>
                            <svg
                              className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${expandedInsight === insight.id ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <p className="text-sm text-brand-text-secondary font-medium mb-3 line-clamp-2">
                            {insight.statement}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {insight.customer_segment && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                {insight.customer_segment}
                              </span>
                            )}
                            {insight.growth_pillar && (
                              <span className="px-2 py-1 bg-brand-gold/20 text-brand-black text-xs font-bold rounded uppercase">
                                {insight.growth_pillar}
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs font-bold rounded ${
                              insight.confidence_level === 'high' ? 'bg-green-100 text-green-700' :
                              insight.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {insight.confidence_level} confidence
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {expandedInsight === insight.id && (
                      <div className="px-6 pb-6 pt-2 border-t border-gray-200 bg-gray-50">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            {insight.journey_stage && (
                              <div>
                                <div className="text-xs font-black text-brand-text-tertiary uppercase mb-1">Journey Stage</div>
                                <div className="text-sm font-medium text-brand-black">{insight.journey_stage}</div>
                              </div>
                            )}
                            {insight.device_type && (
                              <div>
                                <div className="text-xs font-black text-brand-text-tertiary uppercase mb-1">Device</div>
                                <div className="text-sm font-medium text-brand-black">{insight.device_type}</div>
                              </div>
                            )}
                            {insight.page_location && insight.page_location.length > 0 && (
                              <div>
                                <div className="text-xs font-black text-brand-text-tertiary uppercase mb-1">Location</div>
                                <div className="text-sm font-medium text-brand-black">{insight.page_location.join(', ')}</div>
                              </div>
                            )}
                          </div>
                          <div>
                            {insight.suggested_actions && (
                              <div>
                                <div className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Suggested Actions</div>
                                <div className="text-sm text-brand-black">{insight.suggested_actions}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screenshot Modal */}
      {expandedScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpandedScreenshot(null)}
        >
          <div className="relative max-w-6xl max-h-full overflow-auto">
            <button
              className="absolute -top-12 right-0 bg-brand-gold text-black rounded-lg px-4 py-2 font-black text-sm hover:bg-white transition-all duration-200 flex items-center gap-2"
              style={{
                boxShadow: '0 4px 12px rgba(245, 197, 66, 0.3)'
              }}
              onClick={() => setExpandedScreenshot(null)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
            <img
              src={expandedScreenshot}
              alt="Expanded Screenshot"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
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

// Insight Row Component
function InsightRow({ insight, isExpanded, onToggle }: {
  insight: Insight;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const priorityConfig = {
    critical: { label: 'CRITICAL', color: 'bg-red-500 text-white' },
    high: { label: 'HIGH', color: 'bg-orange-500 text-white' },
    medium: { label: 'MEDIUM', color: 'bg-blue-500 text-white' },
    low: { label: 'LOW', color: 'bg-gray-400 text-white' },
  }[insight.priority];

  const confidenceConfig = {
    high: { label: 'High', color: 'text-green-700' },
    medium: { label: 'Med', color: 'text-yellow-700' },
    low: { label: 'Low', color: 'text-red-700' },
  }[insight.confidence_level];

  const statusConfig = {
    draft: { label: 'Draft', color: 'text-gray-600' },
    validated: { label: 'Valid', color: 'text-green-600' },
    archived: { label: 'Arch', color: 'text-orange-600' },
  }[insight.status];

  return (
    <div className="hover:bg-gray-50 transition-colors">
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left"
      >
        <div className="grid grid-cols-12 gap-4 items-start">
          {/* Priority */}
          <div className="col-span-1">
            <span className={`inline-block px-2 py-1 rounded text-xs font-black ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
          </div>

          {/* Insight Statement */}
          <div className="col-span-5">
            {insight.title && (
              <div className="text-sm font-black text-brand-black mb-1">{insight.title}</div>
            )}
            <div className="text-sm text-brand-text-secondary font-medium line-clamp-2">
              {insight.statement}
            </div>
          </div>

          {/* Customer Segment */}
          <div className="col-span-2">
            <div className="text-sm text-brand-black font-medium">
              {insight.customer_segment || '—'}
            </div>
          </div>

          {/* Growth Pillar */}
          <div className="col-span-2">
            <div className="text-sm text-brand-black font-bold uppercase">
              {insight.growth_pillar || '—'}
            </div>
          </div>

          {/* Confidence */}
          <div className="col-span-1">
            <div className={`text-sm font-bold ${confidenceConfig.color}`}>
              {confidenceConfig.label}
            </div>
          </div>

          {/* Status */}
          <div className="col-span-1 flex items-center gap-2">
            <div className={`text-sm font-bold ${statusConfig.color}`}>
              {statusConfig.label}
            </div>
            <svg
              className={`w-4 h-4 text-brand-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-6 pt-4">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Context */}
              <div>
                <div className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Context</div>
                <div className="space-y-1 text-sm">
                  {insight.journey_stage && (
                    <div><span className="font-bold">Journey:</span> {insight.journey_stage}</div>
                  )}
                  {insight.device_type && (
                    <div><span className="font-bold">Device:</span> {insight.device_type}</div>
                  )}
                  {insight.page_location && insight.page_location.length > 0 && (
                    <div><span className="font-bold">Location:</span> {insight.page_location.join(', ')}</div>
                  )}
                </div>
              </div>

              {/* Evidence */}
              {insight.evidence?.qualitative?.quotes && insight.evidence.qualitative.quotes.length > 0 && (
                <div>
                  <div className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Evidence</div>
                  <div className="space-y-2">
                    {insight.evidence.qualitative.quotes.slice(0, 3).map((quote, idx) => (
                      <div key={idx} className="text-sm text-brand-text-secondary italic">"{quote}"</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Behavioral Insights */}
              {(insight.friction_type || insight.psychology_principle) && (
                <div>
                  <div className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Behavioral</div>
                  <div className="space-y-1 text-sm">
                    {insight.friction_type && (
                      <div><span className="font-bold">Friction:</span> {insight.friction_type.replace(/_/g, ' ')}</div>
                    )}
                    {insight.psychology_principle && (
                      <div><span className="font-bold">Psychology:</span> {insight.psychology_principle.replace(/_/g, ' ')}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              {insight.suggested_actions && (
                <div>
                  <div className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Actions</div>
                  <div className="text-sm text-brand-black">{insight.suggested_actions}</div>
                </div>
              )}

              {/* Impact */}
              {insight.affected_kpis && insight.affected_kpis.length > 0 && (
                <div>
                  <div className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Affected KPIs</div>
                  <div className="text-sm text-brand-black">{insight.affected_kpis.join(', ')}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
