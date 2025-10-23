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
import EmptyState from '@/components/EmptyState';

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
  const [showFilters, setShowFilters] = useState(false);

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
      highConfidence: insights.filter(i => i.confidence_level === 'high').length,
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
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="heading-page">Insights</h1>
          </div>
          <p className="text-body-secondary">All insights from your research in one place</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats & Add Button - 2 Column Layout */}
        <div className="mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">{stats.total}</div>
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Total</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-red-600 mb-1">{stats.critical}</div>
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Critical</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-orange-600 mb-1">{stats.high}</div>
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">High</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-green-600 mb-1">{stats.highConfidence}</div>
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Confident</div>
                </div>
              </div>
            </div>

            {/* Right Column - Add Insight Button */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold rounded-xl shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Manual Insight
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Toggle */}
        <div className="mb-6">
          <div className="flex gap-3">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-brand-gold transition-all text-sm font-medium placeholder-gray-400"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 border-2 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                showFilters
                  ? 'bg-brand-gold border-brand-gold text-black'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-brand-gold'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {(selectedPriority !== 'all' || selectedConfidence !== 'all' || selectedPillar !== 'all' || sortBy !== 'priority') && (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="mt-3 bg-white rounded-xl border-2 border-gray-200 p-4 animate-in slide-in-from-top duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Priority Filter */}
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

                {/* Confidence Filter */}
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

                {/* Pillar Filter */}
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

                {/* Sort By */}
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

              {/* Clear Filters Button */}
              {(selectedPriority !== 'all' || selectedConfidence !== 'all' || selectedPillar !== 'all' || sortBy !== 'priority') && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedPriority('all');
                      setSelectedConfidence('all');
                      setSelectedPillar('all');
                      setSortBy('priority');
                    }}
                    className="text-sm font-bold text-gray-600 hover:text-brand-gold transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Insights Table */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {filteredInsights.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            title={searchQuery ? "No insights match your search" : "No insights yet"}
            description={
              searchQuery
                ? "Try adjusting your search or filters to find what you're looking for"
                : "Generate insights by running your first analysis. Our AI will extract key learnings from your research data."
            }
            actionLabel={!searchQuery ? "Start Analysis" : undefined}
            actionHref={!searchQuery ? "/analyze" : undefined}
            secondaryActionLabel="Clear Filters"
            secondaryActionHref="#"
            illustration="lightbulb"
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header - Desktop Only */}
            <div className="hidden lg:block bg-gray-50 border-b border-gray-200 px-6 py-3">
              <div className="grid grid-cols-12 gap-6 text-xs font-black text-brand-text-tertiary uppercase tracking-wide">
                <div className="col-span-1">Priority</div>
                <div className="col-span-4">Insight</div>
                <div className="col-span-2">Source</div>
                <div className="col-span-2">Segment</div>
                <div className="col-span-1">Pillar</div>
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
      </main>

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
      {/* Desktop Table Row */}
      <button
        onClick={onToggle}
        className="hidden lg:block w-full px-6 py-4 text-left"
      >
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Priority */}
          <div className="col-span-1">
            <span className={`inline-block px-2 py-1 rounded text-xs font-black ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
          </div>

          {/* Insight Statement */}
          <div className="col-span-4">
            {insight.title && (
              <div className="text-sm font-black text-brand-black mb-1">{insight.title}</div>
            )}
            <div className="text-sm text-brand-text-secondary font-medium line-clamp-2">
              {insight.statement}
            </div>
          </div>

          {/* Research Source */}
          <div className="col-span-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs font-bold text-blue-700">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {RESEARCH_TYPE_LABELS[insight.research_type]}
            </div>
          </div>

          {/* Customer Segment */}
          <div className="col-span-2">
            <div className="text-sm text-brand-black font-medium">
              {insight.customer_segment || '—'}
            </div>
          </div>

          {/* Growth Pillar */}
          <div className="col-span-1">
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

      {/* Mobile Card Layout */}
      <button
        onClick={onToggle}
        className="lg:hidden w-full px-5 py-5 text-left"
      >
        <div className="space-y-4">
          {/* Top Row - Priority and Source */}
          <div className="flex items-center justify-between gap-3">
            <span className={`inline-block px-2.5 py-1.5 rounded-lg text-xs font-black ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-700">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">{RESEARCH_TYPE_LABELS[insight.research_type]}</span>
              <span className="sm:hidden">{RESEARCH_TYPE_LABELS[insight.research_type].split(' ')[0]}</span>
            </div>
          </div>

          {/* Insight Statement */}
          <div>
            {insight.title && (
              <div className="text-base font-black text-brand-black mb-2 leading-snug">{insight.title}</div>
            )}
            <div className="text-sm text-brand-text-secondary font-medium line-clamp-3 leading-relaxed">
              {insight.statement}
            </div>
          </div>

          {/* Meta Information Grid */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
            <div>
              <div className="text-xs font-black text-brand-text-tertiary uppercase mb-1.5">Segment</div>
              <div className="text-sm text-brand-black font-bold">
                {insight.customer_segment || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-black text-brand-text-tertiary uppercase mb-1.5">Pillar</div>
              <div className="text-sm text-brand-black font-bold uppercase">
                {insight.growth_pillar || '—'}
              </div>
            </div>
          </div>

          {/* Bottom Row - Confidence, Status, Expand Icon */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs font-black text-brand-text-tertiary uppercase mb-1">Confidence</div>
                <div className={`text-sm font-black ${confidenceConfig.color}`}>
                  {confidenceConfig.label}
                </div>
              </div>
              <div>
                <div className="text-xs font-black text-brand-text-tertiary uppercase mb-1">Status</div>
                <div className={`text-sm font-black ${statusConfig.color}`}>
                  {statusConfig.label}
                </div>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-brand-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
