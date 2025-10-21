'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Experiment } from '@/lib/types/insights.types';
import { useWorkspace } from '@/components/WorkspaceContext';
import WorkspaceGuard from '@/components/WorkspaceGuard';

function ExperimentsContent() {
  const supabase = createClientComponentClient();
  const { selectedWorkspaceId, selectedWorkspace } = useWorkspace();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | Experiment['status']>('all');
  const [selectedPillar, setSelectedPillar] = useState<'all' | string>('all');
  const [selectedResult, setSelectedResult] = useState<'all' | 'win' | 'loss' | 'inconclusive' | 'null'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetchExperiments();
  }, [selectedWorkspaceId]);

  const fetchExperiments = async () => {
    if (!selectedWorkspaceId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('experiments')
        .select('*')
        .eq('workspace_id', selectedWorkspaceId)
        .order('created_at', { ascending: false});

      if (fetchError) throw fetchError;

      setExperiments(data || []);
    } catch (err) {
      console.error('Error fetching experiments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  const filteredExperiments = useMemo(() => {
    let filtered = experiments;

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(e => e.status === selectedStatus);
    }

    if (selectedPillar !== 'all') {
      filtered = filtered.filter(e => e.growth_pillar === selectedPillar);
    }

    if (selectedResult !== 'all') {
      filtered = filtered.filter(e => e.result === selectedResult);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.experiment_number.toLowerCase().includes(query) ||
        e.title?.toLowerCase().includes(query) ||
        e.hypothesis?.toLowerCase().includes(query) ||
        e.test_spec?.name?.toLowerCase().includes(query) ||
        e.test_spec?.description?.toLowerCase().includes(query) ||
        e.page_location?.some(loc => loc.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [experiments, selectedStatus, selectedPillar, selectedResult, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: experiments.length,
      running: experiments.filter(e => e.status === 'running').length,
      completed: experiments.filter(e => e.status === 'completed').length,
      wins: experiments.filter(e => e.result === 'win').length,
      losses: experiments.filter(e => e.result === 'loss').length,
      inconclusive: experiments.filter(e => e.result === 'inconclusive').length,
    };
  }, [experiments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto mb-4"></div>
          <p className="text-brand-text-secondary">Loading experiments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-brand-black mb-2">Error Loading Experiments</h2>
          <p className="text-brand-text-secondary mb-4">{error}</p>
          <button
            onClick={fetchExperiments}
            className="px-6 py-2 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show placeholder if no experiments exist
  if (experiments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-4xl font-black text-brand-black mb-3">Experiments</h1>
            <p className="text-lg text-brand-text-secondary font-medium max-w-2xl mx-auto">
              A/B test tracking with results, statistical significance, and learnings extraction
            </p>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center mb-8">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-black rounded-lg mb-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                NO EXPERIMENTS YET
              </div>
              <h2 className="text-2xl font-black text-brand-black mb-4">
                No Experiments Found
              </h2>
              <p className="text-brand-text-secondary mb-8 leading-relaxed">
                Experiments are A/B tests created from approved hypotheses. Create hypotheses first, approve them, then convert them into experiments ready to run.
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex justify-center gap-4">
            <Link
              href="/hypotheses"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
            >
              View Hypotheses
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-600 to-orange-800 text-white border-b-4 border-brand-gold">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-black">Experiments</h1>
                {selectedWorkspace && (
                  <p className="text-orange-200 text-sm font-medium">{selectedWorkspace.name}</p>
                )}
              </div>
            </div>
          </div>
          <p className="text-orange-100 font-medium mb-6">
            A/B test tracking with live results
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-lg p-4">
              <div className="text-2xl font-black text-white">{stats.total}</div>
              <div className="text-xs text-orange-100 uppercase font-bold">Total Tests</div>
            </div>
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-lg p-4">
              <div className="text-2xl font-black text-white">{stats.running}</div>
              <div className="text-xs text-orange-100 uppercase font-bold">Running</div>
            </div>
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-lg p-4">
              <div className="text-2xl font-black text-white">{stats.completed}</div>
              <div className="text-xs text-orange-100 uppercase font-bold">Completed</div>
            </div>
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-lg p-4">
              <div className="text-2xl font-black text-white">{stats.wins}</div>
              <div className="text-xs text-orange-100 uppercase font-bold">Wins</div>
            </div>
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-lg p-4">
              <div className="text-2xl font-black text-white">{stats.losses}</div>
              <div className="text-xs text-orange-100 uppercase font-bold">Losses</div>
            </div>
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-lg p-4">
              <div className="text-2xl font-black text-white">{stats.inconclusive}</div>
              <div className="text-xs text-orange-100 uppercase font-bold">Inconclusive</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search experiments by title, hypothesis, or page location..."
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
                <option value="draft">Draft</option>
                <option value="queued">Queued</option>
                <option value="not_started">Not Started</option>
                <option value="running">Running</option>
                <option value="reviewing">Reviewing</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
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
                value={selectedResult}
                onChange={(e) => setSelectedResult(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold font-bold text-sm"
              >
                <option value="all">All Results</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="inconclusive">Inconclusive</option>
                <option value="null">No Result</option>
              </select>
            </div>
          </div>
        </div>

        {/* Experiments List */}
        {filteredExperiments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-brand-text-secondary">No experiments match your filters</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredExperiments.map((experiment) => (
              <ExperimentCard key={experiment.id} experiment={experiment} onUpdate={fetchExperiments} />
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="flex justify-center gap-4 mt-8">
          <Link
            href="/hypotheses"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300"
          >
            ← View Hypotheses
          </Link>
          <Link
            href="/insights"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
          >
            View Insights →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <WorkspaceGuard>
      <ExperimentsContent />
    </WorkspaceGuard>
  );
}

function ExperimentCard({ experiment, onUpdate }: { experiment: Experiment; onUpdate: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const supabase = createClientComponentClient();
  const [hypothesisData, setHypothesisData] = useState<any>(null);

  useEffect(() => {
    if (isExpanded && experiment.hypothesis_id) {
      fetchHypothesis();
    }
  }, [isExpanded]);

  const fetchHypothesis = async () => {
    try {
      const { data, error } = await supabase
        .from('hypotheses')
        .select('hypothesis_id, statement, expected_impact')
        .eq('id', experiment.hypothesis_id)
        .single();

      if (!error && data) {
        setHypothesisData(data);
      }
    } catch (err) {
      console.error('Error fetching hypothesis:', err);
    }
  };

  const updateStatus = async (newStatus: Experiment['status']) => {
    try {
      const updates: any = { status: newStatus };

      if (newStatus === 'running' && !experiment.start_date) {
        updates.start_date = new Date().toISOString();
      } else if (newStatus === 'completed' && !experiment.end_date) {
        updates.end_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('experiments')
        .update(updates)
        .eq('id', experiment.id);

      if (!error) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const statusConfig = {
    draft: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '📝' },
    queued: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '📋' },
    not_started: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '⏳' },
    running: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '▶️' },
    reviewing: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🔍' },
    completed: { color: 'bg-green-100 text-green-700 border-green-200', icon: '✅' },
    paused: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '⏸️' },
    cancelled: { color: 'bg-red-100 text-red-700 border-red-200', icon: '❌' },
    archived: { color: 'bg-gray-100 text-gray-600 border-gray-300', icon: '📦' },
  };

  const resultConfig = {
    win: { color: 'bg-green-500 text-white border-green-600', icon: '🏆', label: 'WIN' },
    loss: { color: 'bg-red-500 text-white border-red-600', icon: '📉', label: 'LOSS' },
    inconclusive: { color: 'bg-yellow-500 text-white border-yellow-600', icon: '🤷', label: 'INCONCLUSIVE' },
    null: { color: 'bg-gray-400 text-white border-gray-500', icon: '⏱️', label: 'NO RESULT' },
  };

  const pillarConfig = {
    conversion: { color: 'bg-blue-100 text-blue-700', label: 'CONVERSION' },
    aov: { color: 'bg-purple-100 text-purple-700', label: 'AOV' },
    frequency: { color: 'bg-orange-100 text-orange-700', label: 'FREQUENCY' },
    retention: { color: 'bg-pink-100 text-pink-700', label: 'RETENTION' },
    acquisition: { color: 'bg-green-100 text-green-700', label: 'ACQUISITION' },
  };

  const statusConf = statusConfig[experiment.status];
  const resultConf = experiment.result ? resultConfig[experiment.result] : null;
  const pillarConf = pillarConfig[experiment.growth_pillar];
  const hasResults = experiment.results && experiment.results.control && experiment.results.treatment;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-brand-gold transition-all duration-300">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="px-2.5 py-1 bg-brand-gold/10 text-brand-gold text-xs font-black rounded border border-brand-gold/20">
                {experiment.experiment_number}
              </span>
              <span className={`px-2.5 py-1 ${statusConf.color} text-xs font-bold rounded border uppercase`}>
                {experiment.status.replace('_', ' ')}
              </span>
              {resultConf && (
                <span className={`px-2.5 py-1 ${resultConf.color} text-xs font-bold rounded border uppercase`}>
                  {resultConf.icon} {resultConf.label}
                </span>
              )}
              <span className={`px-2.5 py-1 ${pillarConf.color} text-xs font-bold rounded`}>
                {pillarConf.label}
              </span>
              {experiment.test_platform && (
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded border border-blue-200">
                  {experiment.test_platform}
                </span>
              )}
              {hypothesisData && (
                <Link
                  href="/hypotheses"
                  className="px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded border border-purple-200 hover:bg-purple-100"
                >
                  From: {hypothesisData.hypothesis_id}
                </Link>
              )}
            </div>
            <h3 className="text-xl font-black text-brand-black mb-2">{experiment.title || experiment.test_spec?.name || 'Untitled Experiment'}</h3>
            {experiment.hypothesis && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="text-xs font-bold text-blue-900 mb-1">Hypothesis</div>
                <p className="text-sm text-blue-800">{experiment.hypothesis}</p>
              </div>
            )}
            {experiment.test_spec?.description && (
              <p className="text-brand-text-secondary text-sm mb-3">{experiment.test_spec.description}</p>
            )}
          </div>
        </div>

        {/* Context Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {experiment.page_location && experiment.page_location.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-brand-text-secondary">Pages:</span>
              {experiment.page_location.map((page, idx) => (
                <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded border border-indigo-200">
                  📄 {page}
                </span>
              ))}
            </div>
          )}
          {experiment.device_target && (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded border border-purple-200">
              📱 {experiment.device_target}
            </span>
          )}
          {experiment.primary_kpi && (
            <span className="px-2 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded border border-teal-200">
              🎯 {experiment.primary_kpi}
            </span>
          )}
        </div>

        {/* Secondary KPIs */}
        {experiment.secondary_kpis && experiment.secondary_kpis.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold text-brand-text-secondary mb-2">Secondary KPIs:</div>
            <div className="flex flex-wrap gap-1.5">
              {experiment.secondary_kpis.map((kpi, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs font-medium rounded border border-gray-200">
                  {kpi}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Takeaway & Customer Learning */}
        {(experiment.takeaway || experiment.customer_learning) && (
          <div className="space-y-3 mb-4">
            {experiment.takeaway && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-xs font-black text-amber-900 mb-1">Key Takeaway</div>
                <div className="text-sm text-amber-800">{experiment.takeaway}</div>
              </div>
            )}
            {experiment.customer_learning && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <div className="text-xs font-black text-teal-900 mb-1">Customer Learning</div>
                <div className="text-sm text-teal-800">{experiment.customer_learning}</div>
              </div>
            )}
          </div>
        )}

        {/* Action Taken */}
        {experiment.action_taken && (
          <div className="mb-4">
            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
              experiment.action_taken === 'implemented' ? 'bg-green-100 text-green-700 border border-green-200' :
              experiment.action_taken === 'saved' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
              experiment.action_taken === 'iterate' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
              'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              Action: {experiment.action_taken.toUpperCase()}
            </span>
          </div>
        )}

        {/* Test URL */}
        {experiment.test_url && (
          <div className="mb-4">
            <a
              href={experiment.test_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold underline"
            >
              🔗 View Test in Platform →
            </a>
          </div>
        )}

        {/* Results Summary (if completed or running) */}
        {hasResults && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📊</div>
              <div className="flex-1">
                <div className="font-bold text-green-900 mb-3">Test Results</div>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Control */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 font-bold mb-2">CONTROL</div>
                    <div className="flex items-end gap-3">
                      <div className="text-3xl font-black text-gray-900">{experiment.results?.control.conversionRate}</div>
                      <div className="text-xs text-gray-600 mb-1">
                        {experiment.results?.control.conversions?.toLocaleString()} / {experiment.results?.control.visitors?.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Treatment */}
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-xs text-green-700 font-bold mb-2">TREATMENT</div>
                    <div className="flex items-end gap-3">
                      <div className={`text-3xl font-black ${
                        experiment.results?.winner === 'treatment' ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {experiment.results?.treatment.conversionRate}
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {experiment.results?.treatment.conversions?.toLocaleString()} / {experiment.results?.treatment.visitors?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-3 pt-3 border-t border-green-200 flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-green-700 font-bold">Lift: </span>
                    <span className={`font-black ${
                      experiment.results?.winner === 'treatment' ? 'text-green-600' : 'text-gray-700'
                    }`}>
                      {experiment.results?.lift}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700 font-bold">Significance: </span>
                    <span className="font-black text-green-900">{experiment.results?.statisticalSignificance}</span>
                  </div>
                  {experiment.results?.winner && (
                    <div>
                      <span className="text-green-700 font-bold">Winner: </span>
                      <span className="font-black text-green-900 uppercase">{experiment.results.winner}</span>
                    </div>
                  )}
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
            {/* Test Spec */}
            <div>
              <h4 className="text-sm font-black text-brand-black uppercase mb-3">Test Specification</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  {experiment.test_spec?.duration && (
                    <div>
                      <div className="text-xs text-blue-700 font-bold mb-1">Duration</div>
                      <div className="text-sm text-blue-900 font-black">{experiment.test_spec.duration}</div>
                    </div>
                  )}
                  {experiment.test_spec?.sampleSize && (
                    <div>
                      <div className="text-xs text-blue-700 font-bold mb-1">Sample Size</div>
                      <div className="text-sm text-blue-900 font-black">{experiment.test_spec.sampleSize.toLocaleString()} visitors</div>
                    </div>
                  )}
                  {experiment.test_spec?.successMetrics && (
                    <div>
                      <div className="text-xs text-blue-700 font-bold mb-1">Success Metrics</div>
                      <div className="text-sm text-blue-900 font-black">{experiment.test_spec.successMetrics.join(', ')}</div>
                    </div>
                  )}
                </div>
                {experiment.test_spec?.variants && (
                  <div>
                    <div className="text-xs text-blue-700 font-bold mb-2">Variants</div>
                    <div className="space-y-2">
                      {experiment.test_spec.variants.map((variant: any, idx: number) => (
                        <div key={idx} className="bg-white rounded p-2 border border-blue-200">
                          <div className="text-xs font-black text-blue-900">{variant.name}</div>
                          <div className="text-xs text-blue-700">{variant.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Learnings */}
            {experiment.learnings && (
              <div>
                <h4 className="text-sm font-black text-brand-black uppercase mb-3">Learnings</h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                  {experiment.learnings.insights && experiment.learnings.insights.length > 0 && (
                    <div>
                      <div className="text-xs text-purple-700 font-bold mb-2">New Insights</div>
                      <ul className="list-disc list-inside space-y-1">
                        {experiment.learnings.insights.map((insight: string, idx: number) => (
                          <li key={idx} className="text-sm text-purple-900">{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {experiment.learnings.nextSteps && experiment.learnings.nextSteps.length > 0 && (
                    <div>
                      <div className="text-xs text-purple-700 font-bold mb-2">Next Steps</div>
                      <ul className="list-disc list-inside space-y-1">
                        {experiment.learnings.nextSteps.map((step: string, idx: number) => (
                          <li key={idx} className="text-sm text-purple-900">{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {experiment.learnings.unexpectedFindings && experiment.learnings.unexpectedFindings.length > 0 && (
                    <div>
                      <div className="text-xs text-purple-700 font-bold mb-2">Unexpected Findings</div>
                      <ul className="list-disc list-inside space-y-1">
                        {experiment.learnings.unexpectedFindings.map((finding: string, idx: number) => (
                          <li key={idx} className="text-sm text-purple-900">{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              {experiment.status === 'not_started' && (
                <button
                  onClick={() => updateStatus('running')}
                  className="px-4 py-2 bg-purple-500 text-white text-sm font-black rounded-lg hover:bg-purple-600 transition-all duration-300"
                >
                  Start Experiment
                </button>
              )}
              {experiment.status === 'running' && (
                <>
                  <button
                    onClick={() => updateStatus('paused')}
                    className="px-4 py-2 bg-yellow-500 text-white text-sm font-black rounded-lg hover:bg-yellow-600 transition-all duration-300"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => updateStatus('completed')}
                    className="px-4 py-2 bg-green-500 text-white text-sm font-black rounded-lg hover:bg-green-600 transition-all duration-300"
                  >
                    Complete
                  </button>
                </>
              )}
              {experiment.status === 'paused' && (
                <>
                  <button
                    onClick={() => updateStatus('running')}
                    className="px-4 py-2 bg-purple-500 text-white text-sm font-black rounded-lg hover:bg-purple-600 transition-all duration-300"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => updateStatus('cancelled')}
                    className="px-4 py-2 bg-red-500 text-white text-sm font-black rounded-lg hover:bg-red-600 transition-all duration-300"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button className="px-4 py-2 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300">
                Edit Experiment
              </button>
              {experiment.status === 'completed' && !experiment.learnings && (
                <button className="px-4 py-2 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300">
                  Extract Learnings
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
