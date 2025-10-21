'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import type { Insight, ResearchType } from '@/lib/types/insights.types';
import { RESEARCH_TYPE_LABELS } from '@/lib/types/insights.types';
import { ManualInsightModal } from '@/components/ManualInsightModal';
import { useWorkspace } from '@/components/WorkspaceContext';
import WorkspaceGuard from '@/components/WorkspaceGuard';

function InsightsContent() {
  const router = useRouter();
  const supabase = createClient();
  const { selectedWorkspaceId, selectedWorkspace } = useWorkspace();
  const [user, setUser] = useState<any>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConfidence, setSelectedConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedPillar, setSelectedPillar] = useState<'all' | string>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'confidence' | 'priority'>('priority');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetchData();
  }, [selectedWorkspaceId]);

  const fetchData = async () => {
    if (!selectedWorkspaceId) return;

    setLoading(true);
    setError(null);

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);

    // Fetch all insights for this workspace
    const { data, error: insightsError } = await supabase
      .from('insights')
      .select('*')
      .eq('workspace_id', selectedWorkspaceId)
      .order('created_at', { ascending: false });

    if (insightsError) {
      setError(`Failed to load insights: ${insightsError.message}`);
      setInsights([]);
    } else {
      setInsights(data || []);
    }

    setLoading(false);
  };

  // Filter and sort insights
  const filteredInsights = useMemo(() => {
    let filtered = insights;

    // Apply filters
    if (selectedConfidence !== 'all') {
      filtered = filtered.filter(i => i.confidence_level === selectedConfidence);
    }
    if (selectedPillar !== 'all') {
      filtered = filtered.filter(i => i.growth_pillar === selectedPillar);
    }
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(i => i.priority === selectedPriority);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.statement.toLowerCase().includes(query) ||
        i.title?.toLowerCase().includes(query) ||
        i.customer_segment?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'confidence') {
        const confScore = { high: 3, medium: 2, low: 1 };
        return confScore[b.confidence_level] - confScore[a.confidence_level];
      } else if (sortBy === 'priority') {
        const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityScore[b.priority] - priorityScore[a.priority];
      }
      return 0;
    });

    return filtered;
  }, [insights, searchQuery, selectedConfidence, selectedPillar, selectedPriority, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedConfidence, selectedPillar, selectedPriority, sortBy]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredInsights.length / itemsPerPage);
  const paginatedInsights = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInsights.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInsights, currentPage, itemsPerPage]);

  const stats = useMemo(() => {
    return {
      total: insights.length,
      critical: insights.filter(i => i.priority === 'critical').length,
      high: insights.filter(i => i.priority === 'high').length,
      validated: insights.filter(i => i.validation_status === 'validated').length,
    };
  }, [insights]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h1 className="text-3xl font-black text-brand-black">Insights</h1>
                {selectedWorkspace && (
                  <span className="px-3 py-1 bg-brand-gold/20 text-brand-gold text-xs font-bold rounded-lg">
                    {selectedWorkspace.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-text-secondary font-medium">
                All insights from your research in one place
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-brand-gold hover:bg-black text-brand-black hover:text-white font-black rounded-lg transition-all duration-300"
              style={{ boxShadow: '0 4px 12px rgba(245, 197, 66, 0.3)' }}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Insight
              </span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-black text-brand-black">{stats.total}</div>
              <div className="text-xs font-bold text-gray-500">Total Insights</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-black text-red-600">{stats.critical}</div>
              <div className="text-xs font-bold text-gray-500">Critical</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-black text-orange-600">{stats.high}</div>
              <div className="text-xs font-bold text-gray-500">High Priority</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-black text-green-600">{stats.validated}</div>
              <div className="text-xs font-bold text-gray-500">Validated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
              />
            </div>

            {/* Filter dropdowns */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-brand-gold bg-white"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={selectedConfidence}
              onChange={(e) => setSelectedConfidence(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-brand-gold bg-white"
            >
              <option value="all">All Confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-brand-gold bg-white"
            >
              <option value="all">All Pillars</option>
              <option value="conversion">Conversion</option>
              <option value="aov">AOV</option>
              <option value="frequency">Frequency</option>
              <option value="retention">Retention</option>
              <option value="acquisition">Acquisition</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-brand-gold bg-white"
            >
              <option value="priority">Priority</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="confidence">Confidence</option>
            </select>
          </div>
        </div>

        {/* Insights Table */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {filteredInsights.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h3 className="text-xl font-black text-brand-black mb-2">No insights found</h3>
            <p className="text-sm text-brand-text-secondary mb-6">
              {searchQuery ? 'Try adjusting your search or filters' : 'Run an analysis to generate insights'}
            </p>
            {!searchQuery && (
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
              >
                New Analysis
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <div className="grid grid-cols-12 gap-4 text-xs font-black text-brand-text-tertiary uppercase tracking-wide">
                <div className="col-span-1">Priority</div>
                <div className="col-span-5">Insight</div>
                <div className="col-span-2">Segment</div>
                <div className="col-span-2">Pillar</div>
                <div className="col-span-1">Confidence</div>
                <div className="col-span-1">Status</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {paginatedInsights.map((insight) => (
                <InsightRow
                  key={insight.id}
                  insight={insight}
                  isExpanded={expandedInsight === insight.id}
                  onToggle={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredInsights.length > itemsPerPage && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-brand-text-tertiary font-medium">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInsights.length)} of {filteredInsights.length} insights
            </div>

            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-brand-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, idx, arr) => {
                    // Add ellipsis if there's a gap
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsis && (
                          <span className="px-2 text-brand-text-tertiary">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                            currentPage === page
                              ? 'bg-brand-gold text-brand-black'
                              : 'border border-gray-300 text-brand-black hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-brand-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Insight Modal */}
      <ManualInsightModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}

export default function InsightsPage() {
  return (
    <WorkspaceGuard>
      <InsightsContent />
    </WorkspaceGuard>
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

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
            <button className="px-4 py-2 bg-green-50 text-green-700 text-sm font-bold rounded hover:bg-green-100 transition-colors">
              Mark as Validated
            </button>
            <button className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded hover:bg-blue-100 transition-colors">
              Create Hypothesis
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded hover:bg-gray-200 transition-colors">
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
