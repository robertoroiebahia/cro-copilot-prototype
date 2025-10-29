'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Analysis } from '@/lib/types/database.types';
import type { Insight } from '@/lib/types/insights.types';
import { createClient } from '@/utils/supabase/client';
import { GA4FunnelChart } from '@/components/GA4FunnelChart';

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

  // Screenshots removed - no longer displaying screenshots for any analysis type

  const domain = (() => {
    try {
      return new URL(analysis.url).hostname.replace('www.', '');
    } catch {
      return analysis.url;
    }
  })();

  const criticalInsights = insights.filter(i => i.priority === 'critical');
  const highPriorityInsights = insights.filter(i => i.priority === 'high');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Link href="/dashboard" className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black text-brand-black truncate">{domain}</h1>
                <p className="text-xs text-gray-500 font-medium capitalize">
                  {((analysis as any).research_type || 'analysis')?.replace(/_/g, ' ')} • {formattedDate}
                </p>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="text-center px-3 py-1 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-lg font-black text-brand-black">{insights.length}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Insights</div>
              </div>
              {criticalInsights.length > 0 && (
                <div className="text-center px-3 py-1 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-lg font-black text-red-600">{criticalInsights.length}</div>
                  <div className="text-[10px] font-bold text-red-700 uppercase">Critical</div>
                </div>
              )}
              {highPriorityInsights.length > 0 && (
                <div className="text-center px-3 py-1 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-lg font-black text-orange-600">{highPriorityInsights.length}</div>
                  <div className="text-[10px] font-bold text-orange-700 uppercase">High</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Single Column */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <h2 className="text-3xl font-black text-brand-black mb-2">What We Found</h2>
            <p className="text-base text-gray-600">
              Here are the key opportunities to improve your conversion rate. Start with critical and high priority items.
            </p>
          </div>

          {/* Insights */}
          {insights.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-lg text-gray-500 font-bold">No insights found yet</p>
              <p className="text-sm text-gray-400 mt-2">The analysis didn't generate any actionable insights</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => {
                const isExpanded = expandedInsight === insight.id;
                const priorityConfig = {
                  critical: { label: 'CRITICAL', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                  high: { label: 'HIGH', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                  medium: { label: 'MEDIUM', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                  low: { label: 'LOW', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
                }[insight.priority];

                return (
                  <button
                    key={insight.id}
                    onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                    className={`w-full text-left bg-white rounded-lg border-2 ${priorityConfig.border} hover:shadow-lg transition-all duration-200 overflow-hidden`}
                  >
                    <div className="p-6">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-black ${priorityConfig.color} uppercase tracking-wider`}>
                            {priorityConfig.label}
                          </span>
                          {insight.growth_pillar && (
                            <span className="text-xs font-bold text-gray-500 uppercase">
                              {insight.growth_pillar}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Title */}
                      {insight.title && (
                        <h3 className="text-xl font-black text-brand-black mb-2 leading-tight">
                          {insight.title}
                        </h3>
                      )}

                      {/* Statement */}
                      <p className="text-base text-gray-700 leading-relaxed mb-4">
                        {insight.statement}
                      </p>

                      {/* Action */}
                      {insight.suggested_actions && !isExpanded && (
                        <div className="text-sm text-gray-600 leading-relaxed">
                          <span className="font-bold text-brand-black">Action: </span>
                          {insight.suggested_actions}
                        </div>
                      )}

                      {/* Expanded Details - Show EVERYTHING */}
                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
                          {/* Action */}
                          {insight.suggested_actions && (
                            <div>
                              <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Recommended Action</div>
                              <div className="text-base text-brand-black leading-relaxed">{insight.suggested_actions}</div>
                            </div>
                          )}

                          {/* All Fields Grid */}
                          <div className="grid grid-cols-2 gap-6">
                            {insight.customer_segment && (
                              <div>
                                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Customer Segment</div>
                                <div className="text-sm text-brand-black">{insight.customer_segment}</div>
                              </div>
                            )}
                            {insight.journey_stage && (
                              <div>
                                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Journey Stage</div>
                                <div className="text-sm text-brand-black">{insight.journey_stage}</div>
                              </div>
                            )}
                            {insight.device_type && (
                              <div>
                                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Device</div>
                                <div className="text-sm text-brand-black">{insight.device_type}</div>
                              </div>
                            )}
                            {insight.page_location && insight.page_location.length > 0 && (
                              <div>
                                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Page Location</div>
                                <div className="text-sm text-brand-black">{insight.page_location.join(', ')}</div>
                              </div>
                            )}
                            {insight.friction_type && (
                              <div>
                                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Friction Type</div>
                                <div className="text-sm text-brand-black">{insight.friction_type.replace(/_/g, ' ')}</div>
                              </div>
                            )}
                            {insight.psychology_principle && (
                              <div>
                                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Psychology Principle</div>
                                <div className="text-sm text-brand-black">{insight.psychology_principle.replace(/_/g, ' ')}</div>
                              </div>
                            )}
                            {insight.affected_kpis && insight.affected_kpis.length > 0 && (
                              <div>
                                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Affected KPIs</div>
                                <div className="text-sm text-brand-black">{insight.affected_kpis.join(', ')}</div>
                              </div>
                            )}
                            {insight.status && (
                              <div>
                                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Status</div>
                                <div className="text-sm text-brand-black capitalize">{insight.status}</div>
                              </div>
                            )}
                          </div>

                          {/* Evidence */}
                          {insight.evidence && (
                            <div>
                              <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Evidence</div>
                              <div className="bg-gray-50 rounded-lg p-4">
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                                  {JSON.stringify(insight.evidence, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Raw Data */}
                          <details className="group">
                            <summary className="text-xs font-black text-gray-500 uppercase tracking-wide cursor-pointer hover:text-brand-gold">
                              Show Raw Data
                            </summary>
                            <div className="mt-2 bg-gray-50 rounded-lg p-4">
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                                {JSON.stringify(insight, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
