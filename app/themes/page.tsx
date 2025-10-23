'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Theme } from '@/lib/types/insights.types';
import { useWorkspace } from '@/components/WorkspaceContext';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import EmptyState from '@/components/EmptyState';

function ThemesContent() {
  const supabase = createClientComponentClient();
  const { selectedWorkspaceId, selectedWorkspace } = useWorkspace();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [selectedPillar, setSelectedPillar] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetchThemes();
  }, [selectedWorkspaceId]);

  const fetchThemes = async () => {
    if (!selectedWorkspaceId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('themes')
        .select('*')
        .eq('workspace_id', selectedWorkspaceId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setThemes(data || []);
    } catch (err) {
      console.error('Error fetching themes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load themes');
    } finally {
      setLoading(false);
    }
  };

  const filteredThemes = useMemo(() => {
    let filtered = themes;

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === selectedPriority);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(t => t.status === selectedStatus);
    }

    if (selectedPillar !== 'all') {
      filtered = filtered.filter(t => t.growth_pillar === selectedPillar);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.theme_statement.toLowerCase().includes(query) ||
        t.affected_pages?.some(page => page.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [themes, selectedPriority, selectedStatus, selectedPillar, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: themes.length,
      active: themes.filter(t => t.status === 'active').length,
      archived: themes.filter(t => t.status === 'archived').length,
      critical: themes.filter(t => t.priority === 'critical').length,
      high: themes.filter(t => t.priority === 'high').length,
      medium: themes.filter(t => t.priority === 'medium').length,
      low: themes.filter(t => t.priority === 'low').length,
    };
  }, [themes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto mb-4"></div>
          <p className="text-brand-text-secondary">Loading themes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-brand-black mb-2">Error Loading Themes</h2>
          <p className="text-brand-text-secondary mb-4">{error}</p>
          <button
            onClick={fetchThemes}
            className="px-6 py-2 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show placeholder if no themes exist
  if (themes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h1 className="heading-page">Themes</h1>
            </div>
            <p className="text-body-secondary">Clustered patterns from related insights</p>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          <EmptyState
            icon={
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            }
            title="No themes yet"
            description="Themes are automatically created by clustering 2-5 related insights. Create insights from your research, and themes will appear here showing broader conversion patterns and opportunities."
            actionLabel="View Insights"
            actionHref="/insights"
            secondaryActionLabel="Back to Dashboard"
            secondaryActionHref="/dashboard"
            illustration="folder"
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
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h1 className="heading-page">Themes</h1>
          </div>
          <p className="text-body-secondary">Clustered patterns from related insights</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="mb-6">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-stat-medium mb-1">{stats.total}</div>
              <div className="text-label">Total Themes</div>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <div className="text-stat-medium text-green-600 mb-1">{stats.active}</div>
              <div className="text-label">Active</div>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <div className="text-stat-medium text-gray-600 mb-1">{stats.archived}</div>
              <div className="text-label">Archived</div>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <div className="text-stat-medium text-red-600 mb-1">{stats.critical}</div>
              <div className="text-label">Critical</div>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <div className="text-stat-medium text-orange-600 mb-1">{stats.high}</div>
              <div className="text-label">High Priority</div>
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
                placeholder="Search themes by title, statement, or affected pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold font-medium"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold font-bold text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={selectedPillar}
                onChange={(e) => setSelectedPillar(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold font-bold text-sm"
              >
                <option value="all">All Pillars</option>
                <option value="conversion">Conversion</option>
                <option value="aov">AOV</option>
                <option value="frequency">Frequency</option>
                <option value="retention">Retention</option>
                <option value="acquisition">Acquisition</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold font-bold text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Themes List */}
        {filteredThemes.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            title="No themes match your filters"
            description="Try adjusting your search or filter settings to find what you're looking for"
            actionLabel="Clear Filters"
            actionOnClick={() => {
              setSelectedStatus('all');
              setSelectedPillar('all');
              setSelectedPriority('all');
              setSearchQuery('');
            }}
            illustration="search"
          />
        ) : (
          <div className="space-y-6">
            {filteredThemes.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} />
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="flex justify-center gap-4 mt-8">
          <Link
            href="/insights"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300"
          >
            ← View Insights
          </Link>
          <Link
            href="/hypotheses"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
          >
            View Hypotheses →
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function ThemesPage() {
  return (
    <WorkspaceGuard>
      <ThemesContent />
    </WorkspaceGuard>
  );
}

function ThemeCard({ theme }: { theme: Theme }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const supabase = createClientComponentClient();
  const [connectedInsightsData, setConnectedInsightsData] = useState<any[]>([]);

  useEffect(() => {
    if (isExpanded && theme.connected_insights.length > 0) {
      fetchConnectedInsights();
    }
  }, [isExpanded]);

  const fetchConnectedInsights = async () => {
    try {
      const insightIds = theme.connected_insights.map((ci: any) => ci.insightId);

      const { data, error } = await supabase
        .from('insights')
        .select('insight_id, statement, confidence_level')
        .in('insight_id', insightIds);

      if (!error && data) {
        setConnectedInsightsData(data);
      }
    } catch (err) {
      console.error('Error fetching connected insights:', err);
    }
  };

  const priorityConfig = {
    critical: { color: 'bg-red-500 text-white border-red-600', icon: '🔴' },
    high: { color: 'bg-orange-500 text-white border-orange-600', icon: '🟠' },
    medium: { color: 'bg-blue-500 text-white border-blue-600', icon: '🟡' },
    low: { color: 'bg-gray-400 text-white border-gray-500', icon: '⚪' },
  };

  const statusConfig = {
    active: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Active' },
    archived: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Archived' },
  };

  const pillarConfig = {
    conversion: { color: 'bg-blue-100 text-blue-700', label: 'CONVERSION' },
    aov: { color: 'bg-purple-100 text-purple-700', label: 'AOV' },
    frequency: { color: 'bg-orange-100 text-orange-700', label: 'FREQUENCY' },
    retention: { color: 'bg-pink-100 text-pink-700', label: 'RETENTION' },
    acquisition: { color: 'bg-green-100 text-green-700', label: 'ACQUISITION' },
  };

  const priorityConf = priorityConfig[theme.priority];
  const statusConf = statusConfig[theme.status];
  const pillarConf = pillarConfig[theme.growth_pillar];

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-brand-gold transition-all duration-300">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="px-2.5 py-1 bg-brand-gold/10 text-brand-gold text-xs font-black rounded border border-brand-gold/20">
                {theme.theme_id}
              </span>
              <span className={`px-2.5 py-1 ${priorityConf.color} text-xs font-bold rounded border uppercase`}>
                {theme.priority}
              </span>
              <span className={`px-2.5 py-1 ${statusConf.color} text-xs font-bold rounded border`}>
                {statusConf.label}
              </span>
              <span className={`px-2.5 py-1 ${pillarConf.color} text-xs font-bold rounded`}>
                {pillarConf.label}
              </span>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded border border-blue-200">
                {theme.connected_insights.length} Insights
              </span>
            </div>
            <h3 className="text-xl font-black text-brand-black mb-2">{theme.title}</h3>
            <p className="text-brand-text-secondary leading-relaxed">{theme.theme_statement}</p>
          </div>
        </div>

        {/* Affected Pages */}
        {theme.affected_pages && theme.affected_pages.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold text-brand-text-secondary mb-2">Affected Pages:</div>
            <div className="flex flex-wrap gap-2">
              {theme.affected_pages.map((page, idx) => (
                <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded border border-indigo-200">
                  📄 {page}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Current Performance */}
        {theme.current_performance && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="text-xs font-black text-amber-900 mb-1">Current Performance</div>
            <div className="text-sm text-amber-800">{theme.current_performance}</div>
          </div>
        )}

        {/* Opportunity Calculation */}
        {theme.opportunity_calculation && theme.opportunity_calculation.can_calculate && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📈</div>
              <div className="flex-1">
                <div className="font-bold text-purple-900 mb-2">Opportunity Sizing</div>
                {theme.opportunity_calculation.scenarios && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="bg-white rounded p-3">
                      <div className="text-xs text-purple-700 font-bold mb-1">Conservative</div>
                      <div className="text-lg text-purple-900 font-black">{theme.opportunity_calculation.scenarios.conservative}</div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="text-xs text-purple-700 font-bold mb-1">Moderate</div>
                      <div className="text-lg text-purple-900 font-black">{theme.opportunity_calculation.scenarios.moderate}</div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="text-xs text-purple-700 font-bold mb-1">Aggressive</div>
                      <div className="text-lg text-purple-900 font-black">{theme.opportunity_calculation.scenarios.aggressive}</div>
                    </div>
                  </div>
                )}
                {theme.opportunity_calculation.data_sources && theme.opportunity_calculation.data_sources.length > 0 && (
                  <div className="text-xs text-purple-700">
                    <span className="font-bold">Data Sources:</span> {theme.opportunity_calculation.data_sources.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Business Impact Summary */}
        {theme.business_impact && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💰</div>
              <div className="flex-1">
                <div className="font-bold text-green-900 mb-1">Business Impact</div>
                <p className="text-sm text-green-800 mb-2">{theme.business_impact.description}</p>
                {theme.business_impact.estimatedValue && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-green-700 font-bold">Current</div>
                      <div className="text-green-900 font-black">{theme.business_impact.estimatedValue.currentValue}</div>
                    </div>
                    <div>
                      <div className="text-green-700 font-bold">Potential</div>
                      <div className="text-green-900 font-black">{theme.business_impact.estimatedValue.potentialValue}</div>
                    </div>
                    <div>
                      <div className="text-green-700 font-bold">Metric</div>
                      <div className="text-green-900 font-black">{theme.business_impact.estimatedValue.metric.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-green-700 font-bold">Annual Impact</div>
                      <div className="text-green-900 font-black text-lg">{theme.business_impact.estimatedValue.annualImpact}</div>
                    </div>
                  </div>
                )}
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
            {/* Connected Insights */}
            <div>
              <h4 className="text-sm font-black text-brand-black uppercase mb-3">Connected Insights</h4>
              <div className="space-y-2">
                {connectedInsightsData.map((insight) => {
                  const connection = theme.connected_insights.find((ci: any) => ci.insightId === insight.insight_id);
                  return (
                    <div key={insight.insight_id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-brand-text-secondary">{insight.insight_id}</span>
                            {connection && (
                              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                connection.relevance === 'primary' ? 'bg-purple-100 text-purple-700' :
                                connection.relevance === 'supporting' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {connection.relevance}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                              insight.confidence_level === 'high' ? 'bg-green-100 text-green-700' :
                              insight.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {insight.confidence_level}
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

            {/* Recommended Actions */}
            {theme.recommended_actions && theme.recommended_actions.length > 0 && (
              <div>
                <h4 className="text-sm font-black text-brand-black uppercase mb-3">Recommended Actions</h4>
                <div className="space-y-3">
                  {theme.recommended_actions.map((action, idx) => (
                    <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">
                          {action.type === 'quick_fix' ? '⚡' : action.type === 'strategic' ? '🎯' : '🔬'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase">
                              {action.type.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 text-xs font-bold rounded ${
                              action.effort === 'low' ? 'bg-green-100 text-green-700' :
                              action.effort === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {action.effort} effort
                            </span>
                            <span className={`px-2 py-1 text-xs font-bold rounded ${
                              action.expectedImpact === 'high' ? 'bg-green-100 text-green-700' :
                              action.expectedImpact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {action.expectedImpact} impact
                            </span>
                          </div>
                          <p className="text-sm text-blue-900">{action.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link
                href={`/hypotheses/new?themeId=${theme.id}`}
                className="flex-1 px-4 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300 text-center"
              >
                Create Hypothesis
              </Link>
              <button className="px-4 py-3 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300">
                Edit Theme
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
