'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Hypothesis } from '@/lib/types/insights.types';
import { useWorkspace } from '@/components/WorkspaceContext';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import EmptyState from '@/components/EmptyState';

function HypothesesContent() {
  const supabase = createClientComponentClient();
  const { selectedWorkspaceId, selectedWorkspace } = useWorkspace();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | Hypothesis['status']>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'P0' | 'P1' | 'P2'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetchHypotheses();
  }, [selectedWorkspaceId]);

  const fetchHypotheses = async () => {
    if (!selectedWorkspaceId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('hypotheses')
        .select('*')
        .eq('workspace_id', selectedWorkspaceId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setHypotheses(data || []);
    } catch (err) {
      console.error('Error fetching hypotheses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load hypotheses');
    } finally {
      setLoading(false);
    }
  };

  const filteredHypotheses = useMemo(() => {
    let filtered = hypotheses;

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(h => h.status === selectedStatus);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(h => h.priority === selectedPriority);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        h.statement.toLowerCase().includes(query) ||
        h.hypothesis_id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [hypotheses, selectedStatus, selectedPriority, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: hypotheses.length,
      draft: hypotheses.filter(h => h.status === 'draft').length,
      approved: hypotheses.filter(h => h.status === 'approved').length,
      testing: hypotheses.filter(h => h.status === 'testing').length,
      validated: hypotheses.filter(h => h.status === 'validated').length,
      invalidated: hypotheses.filter(h => h.status === 'invalidated').length,
    };
  }, [hypotheses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto mb-4"></div>
          <p className="text-brand-text-secondary">Loading hypotheses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-brand-black mb-2">Error Loading Hypotheses</h2>
          <p className="text-brand-text-secondary mb-4">{error}</p>
          <button
            onClick={fetchHypotheses}
            className="px-6 py-2 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show placeholder if no hypotheses exist
  if (hypotheses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h1 className="heading-page">Hypotheses</h1>
            </div>
            <p className="text-body-secondary">Testable predictions ready for experimentation</p>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          <EmptyState
            icon={
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
            title="No hypotheses yet"
            description="Hypotheses are testable predictions based on themes. Create themes first, then convert them into structured hypotheses in the format: 'If we [change], then [outcome] because [reasoning].'"
            actionLabel="View Themes"
            actionHref="/themes"
            secondaryActionLabel="Back to Dashboard"
            secondaryActionHref="/dashboard"
            illustration="flask"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="heading-page">Hypotheses</h1>
          </div>
          <p className="text-body-secondary">Testable predictions ready for experimentation</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="mb-6">
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <div className="text-stat-medium mb-1">{stats.total}</div>
              <div className="text-label">Total</div>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <div className="text-stat-medium text-gray-600 mb-1">{stats.draft}</div>
              <div className="text-label">Draft</div>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <div className="text-stat-medium text-blue-600 mb-1">{stats.approved}</div>
              <div className="text-label">Approved</div>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <div className="text-stat-medium text-purple-600 mb-1">{stats.testing}</div>
              <div className="text-label">Testing</div>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <div className="text-stat-medium text-green-600 mb-1">{stats.validated}</div>
              <div className="text-label">Validated</div>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <div className="text-stat-medium text-red-600 mb-1">{stats.invalidated}</div>
              <div className="text-label">Invalid</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search hypotheses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="testing">Testing</option>
              <option value="validated">Validated</option>
              <option value="invalidated">Invalidated</option>
              <option value="archived">Archived</option>
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="P0">P0 - Critical</option>
              <option value="P1">P1 - High</option>
              <option value="P2">P2 - Medium</option>
            </select>
          </div>
        </div>

        {/* Hypotheses List */}
        {filteredHypotheses.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            title="No hypotheses match your filters"
            description="Try adjusting your search or filter settings to find what you're looking for"
            actionLabel="Clear Filters"
            actionOnClick={() => {
              setSelectedStatus('all');
              setSelectedPriority('all');
              setSearchQuery('');
            }}
            illustration="search"
          />
        ) : (
          <div className="space-y-6">
            {filteredHypotheses.map((hypothesis) => (
              <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} onUpdate={fetchHypotheses} />
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="flex justify-center gap-4 mt-8">
          <Link
            href="/themes"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300"
          >
            ← View Themes
          </Link>
          <Link
            href="/experiments"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
          >
            View Experiments →
          </Link>
        </div>
      </main>
    </div>
  );
}

function HypothesisCard({ hypothesis, onUpdate }: { hypothesis: Hypothesis; onUpdate: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const supabase = createClientComponentClient();
  const [basedOnInsightsData, setBasedOnInsightsData] = useState<any[]>([]);
  const [themeData, setThemeData] = useState<any>(null);

  useEffect(() => {
    if (isExpanded) {
      if (hypothesis.based_on_insights.length > 0) {
        fetchBasedOnInsights();
      }
      if (hypothesis.theme_id) {
        fetchTheme();
      }
    }
  }, [isExpanded]);

  const fetchBasedOnInsights = async () => {
    try {
      const insightIds = hypothesis.based_on_insights.map((bi: any) => bi.insightId);

      const { data, error } = await supabase
        .from('insights')
        .select('insight_id, statement, confidence')
        .in('insight_id', insightIds);

      if (!error && data) {
        setBasedOnInsightsData(data);
      }
    } catch (err) {
      console.error('Error fetching insights:', err);
    }
  };

  const fetchTheme = async () => {
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('theme_id, name')
        .eq('id', hypothesis.theme_id)
        .single();

      if (!error && data) {
        setThemeData(data);
      }
    } catch (err) {
      console.error('Error fetching theme:', err);
    }
  };

  const updateStatus = async (newStatus: Hypothesis['status']) => {
    try {
      const { error } = await supabase
        .from('hypotheses')
        .update({ status: newStatus })
        .eq('id', hypothesis.id);

      if (!error) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const statusConfig = {
    draft: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '📝' },
    approved: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '✅' },
    testing: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🧪' },
    validated: { color: 'bg-green-100 text-green-700 border-green-200', icon: '🎉' },
    invalidated: { color: 'bg-red-100 text-red-700 border-red-200', icon: '❌' },
    archived: { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: '📦' },
  };

  const priorityConfig = {
    P0: { color: 'bg-red-100 text-red-700', label: 'P0 - Critical' },
    P1: { color: 'bg-orange-100 text-orange-700', label: 'P1 - High' },
    P2: { color: 'bg-yellow-100 text-yellow-700', label: 'P2 - Medium' },
  };

  const config = statusConfig[hypothesis.status];
  const priorityStyle = hypothesis.priority ? priorityConfig[hypothesis.priority] : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-brand-gold transition-all duration-300">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-black text-brand-text-secondary">{hypothesis.hypothesis_id}</span>
              <span className={`px-2 py-1 ${config.color} text-xs font-bold rounded border uppercase`}>
                {config.icon} {hypothesis.status}
              </span>
              {priorityStyle && (
                <span className={`px-2 py-1 ${priorityStyle.color} text-xs font-bold rounded`}>
                  {priorityStyle.label}
                </span>
              )}
              {themeData && (
                <Link
                  href="/themes"
                  className="px-2 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded border border-purple-200 hover:bg-purple-100"
                >
                  From: {themeData.theme_id}
                </Link>
              )}
            </div>
            <h3 className="text-lg font-bold text-brand-black mb-2 leading-relaxed">{hypothesis.statement}</h3>
          </div>
        </div>

        {/* Expected Impact Summary */}
        {hypothesis.expected_impact && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📈</div>
              <div className="flex-1">
                <div className="font-bold text-blue-900 mb-2">Expected Impact</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <div>
                    <div className="text-blue-700 font-bold">Metric</div>
                    <div className="text-blue-900 font-black">{hypothesis.expected_impact.metric?.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="text-blue-700 font-bold">Baseline</div>
                    <div className="text-blue-900 font-black">{hypothesis.expected_impact.baseline}</div>
                  </div>
                  <div>
                    <div className="text-blue-700 font-bold">Predicted</div>
                    <div className="text-blue-900 font-black">{hypothesis.expected_impact.predicted}</div>
                  </div>
                  <div>
                    <div className="text-blue-700 font-bold">Expected Lift</div>
                    <div className="text-blue-900 font-black text-lg">{hypothesis.expected_impact.lift}</div>
                  </div>
                  <div>
                    <div className="text-blue-700 font-bold">Confidence</div>
                    <div className={`font-black ${
                      hypothesis.expected_impact.confidence === 'high' ? 'text-green-700' :
                      hypothesis.expected_impact.confidence === 'medium' ? 'text-yellow-700' :
                      'text-gray-700'
                    }`}>
                      {hypothesis.expected_impact.confidence}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300"
        >
          {isExpanded ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide Details
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show Details
            </>
          )}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
            {/* Based On Insights */}
            {basedOnInsightsData.length > 0 && (
              <div>
                <h4 className="text-sm font-black text-brand-black uppercase mb-3">Based On Insights</h4>
                <div className="space-y-2">
                  {basedOnInsightsData.map((insight) => {
                    const connection = hypothesis.based_on_insights.find((bi: any) => bi.insightId === insight.insight_id);
                    return (
                      <div key={insight.insight_id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-brand-text-secondary">{insight.insight_id}</span>
                              {connection && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                  Weight: {Math.round(connection.weight * 100)}%
                                </span>
                              )}
                              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                insight.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                insight.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {insight.confidence}
                              </span>
                            </div>
                            <p className="text-sm text-brand-text-secondary">{insight.statement}</p>
                          </div>
                          <Link
                            href={`/insights?highlight=${insight.insight_id}`}
                            className="text-brand-gold hover:text-black text-xs font-bold whitespace-nowrap"
                          >
                            View →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Test Design */}
            {hypothesis.test_design && (
              <div>
                <h4 className="text-sm font-black text-brand-black uppercase mb-3">Test Design</h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-purple-700 font-bold mb-1">Test Type</div>
                      <div className="text-sm text-purple-900 font-black uppercase">{hypothesis.test_design.testType}</div>
                    </div>
                    <div>
                      <div className="text-xs text-purple-700 font-bold mb-1">Duration</div>
                      <div className="text-sm text-purple-900 font-black">{hypothesis.test_design.duration}</div>
                    </div>
                    <div>
                      <div className="text-xs text-purple-700 font-bold mb-1">Sample Size</div>
                      <div className="text-sm text-purple-900 font-black">{hypothesis.test_design.sampleSize?.toLocaleString()} visitors</div>
                    </div>
                    <div>
                      <div className="text-xs text-purple-700 font-bold mb-1">Success Metrics</div>
                      <div className="text-sm text-purple-900 font-black">{hypothesis.test_design.successMetrics?.join(', ')}</div>
                    </div>
                  </div>
                  {hypothesis.test_design.variants && (
                    <div>
                      <div className="text-xs text-purple-700 font-bold mb-2">Variants</div>
                      <div className="space-y-2">
                        {hypothesis.test_design.variants.map((variant: any, idx: number) => (
                          <div key={idx} className="bg-white rounded p-2 border border-purple-200">
                            <div className="text-xs font-black text-purple-900">{variant.name}</div>
                            <div className="text-xs text-purple-700">{variant.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              {hypothesis.status === 'draft' && (
                <button
                  onClick={() => updateStatus('approved')}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-black rounded-lg hover:bg-blue-600 transition-all duration-300"
                >
                  Approve
                </button>
              )}
              {hypothesis.status === 'approved' && (
                <>
                  <Link
                    href={`/experiments/new?hypothesisId=${hypothesis.id}`}
                    className="px-4 py-2 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
                  >
                    Create Experiment
                  </Link>
                  <button
                    onClick={() => updateStatus('testing')}
                    className="px-4 py-2 bg-purple-500 text-white text-sm font-black rounded-lg hover:bg-purple-600 transition-all duration-300"
                  >
                    Mark as Testing
                  </button>
                </>
              )}
              {hypothesis.status === 'testing' && (
                <>
                  <button
                    onClick={() => updateStatus('validated')}
                    className="px-4 py-2 bg-green-500 text-white text-sm font-black rounded-lg hover:bg-green-600 transition-all duration-300"
                  >
                    Validate
                  </button>
                  <button
                    onClick={() => updateStatus('invalidated')}
                    className="px-4 py-2 bg-red-500 text-white text-sm font-black rounded-lg hover:bg-red-600 transition-all duration-300"
                  >
                    Invalidate
                  </button>
                </>
              )}
              <button className="px-4 py-2 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300">
                Edit Hypothesis
              </button>
              {hypothesis.status !== 'archived' && (
                <button
                  onClick={() => updateStatus('archived')}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-500 text-sm font-bold rounded-lg hover:border-gray-400 transition-all duration-300"
                >
                  Archive
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HypothesesPage() {
  return (
    <WorkspaceGuard>
      <HypothesesContent />
    </WorkspaceGuard>
  );
}
