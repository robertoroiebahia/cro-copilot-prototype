'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import type { ResearchType } from '@/lib/types/insights.types';
import { RESEARCH_TYPE_LABELS, RESEARCH_TYPE_ICONS } from '@/lib/types/insights.types';
import { useWorkspace } from '@/components/WorkspaceContext';
import WorkspaceGuard from '@/components/WorkspaceGuard';

interface Analysis {
  id: string;
  url: string;
  research_type: ResearchType;
  name?: string;
  status: string;
  created_at: string;
  insights_count?: number;
}

// Color mapping for research types
const RESEARCH_TYPE_COLORS: Record<ResearchType, { bg: string; text: string }> = {
  page_analysis: { bg: 'bg-blue-100', text: 'text-blue-700' },
  ga_analysis: { bg: 'bg-purple-100', text: 'text-purple-700' },
  survey_analysis: { bg: 'bg-green-100', text: 'text-green-700' },
  heatmap_analysis: { bg: 'bg-orange-100', text: 'text-orange-700' },
  user_testing: { bg: 'bg-pink-100', text: 'text-pink-700' },
  competitor_analysis: { bg: 'bg-teal-100', text: 'text-teal-700' },
  review_mining: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  onsite_poll: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

function AllAnalysesContent() {
  const router = useRouter();
  const supabase = createClient();
  const { selectedWorkspaceId, selectedWorkspace } = useWorkspace();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResearchType, setSelectedResearchType] = useState<'all' | ResearchType>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetchData();
  }, [selectedWorkspaceId]);

  const fetchData = async () => {
    if (!selectedWorkspaceId) return;

    setLoading(true);
    setError(null);

    // Fetch all analyses for the workspace
    const { data, error: analysesError } = await supabase
      .from('analyses')
      .select('*')
      .eq('workspace_id', selectedWorkspaceId)
      .order('created_at', { ascending: false });

    if (analysesError) {
      setError(`Failed to load analyses: ${analysesError.message}`);
      setAnalyses([]);
    } else {
      // Fetch insights count for each analysis
      const analysesWithCounts = await Promise.all(
        (data || []).map(async (analysis) => {
          const { count } = await supabase
            .from('insights')
            .select('*', { count: 'exact', head: true })
            .eq('analysis_id', analysis.id);

          return {
            ...analysis,
            insights_count: count || 0,
          };
        })
      );

      setAnalyses(analysesWithCounts);
    }

    setLoading(false);
  };

  // Filter and sort analyses
  const filteredAnalyses = useMemo(() => {
    let filtered = analyses;

    // Apply research type filter
    if (selectedResearchType !== 'all') {
      filtered = filtered.filter(a => a.research_type === selectedResearchType);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.url.toLowerCase().includes(query) ||
        a.name?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
    });

    return filtered;
  }, [analyses, searchQuery, selectedResearchType, sortBy]);

  // Paginated results
  const paginatedAnalyses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAnalyses.slice(startIndex, endIndex);
  }, [filteredAnalyses, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAnalyses.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedResearchType, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = analyses.length;
    const byType = analyses.reduce((acc, analysis) => {
      const type = analysis.research_type || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalInsights = analyses.reduce((sum, a) => sum + (a.insights_count || 0), 0);

    return { total, byType, totalInsights };
  }, [analyses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading analyses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto padding-container-lg">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <h1 className="heading-page">All Analyses</h1>
              </div>
              <p className="text-body-secondary">
                View all your research across all methodologies
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-brand-black font-bold rounded-lg transition-all duration-200 border-2 border-gray-200 hover:border-brand-black"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border border-gray-200 rounded-lg padding-container-sm">
              <div className="text-stat-medium mb-1">{stats.total}</div>
              <div className="text-label">Total Analyses</div>
            </div>
            <div className="border border-gray-200 rounded-lg padding-container-sm">
              <div className="text-stat-medium text-brand-gold mb-1">{stats.totalInsights}</div>
              <div className="text-label">Total Insights</div>
            </div>
            <div className="border border-gray-200 rounded-lg padding-container-sm">
              <div className="text-stat-medium mb-1">
                {Object.keys(stats.byType).length}
              </div>
              <div className="text-label">Research Types</div>
            </div>
          </div>

          {/* Research Type Breakdown */}
          {Object.keys(stats.byType).length > 0 && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 padding-container-sm">
              <h3 className="text-label mb-3">
                Analyses by Type (Click to filter)
              </h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.byType).map(([type, count]) => {
                  const isSelected = selectedResearchType === type;
                  const colors = RESEARCH_TYPE_COLORS[type as ResearchType] || { bg: 'bg-gray-100', text: 'text-gray-700' };

                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedResearchType(isSelected ? 'all' : type as ResearchType)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                        isSelected
                          ? 'bg-white border-brand-gold shadow-md'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`text-xs font-black px-2 py-1 ${colors.bg} ${colors.text} rounded`}>
                        {RESEARCH_TYPE_ICONS[type as ResearchType] || 'OR'}
                      </span>
                      <div>
                        <div className="text-body-secondary font-bold text-brand-black">{count}</div>
                        <div className="text-caption text-left">
                          {RESEARCH_TYPE_LABELS[type as ResearchType] || type}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto padding-container-lg">
        <div className="bg-white rounded-lg border border-gray-200 padding-container-sm mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Search - Takes more space */}
            <div className="lg:col-span-6">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search analyses by URL or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Filters - Fixed width dropdowns */}
            <div className="lg:col-span-6 flex gap-3">
              <select
                value={selectedResearchType}
                onChange={(e) => setSelectedResearchType(e.target.value as any)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:border-brand-gold transition-all bg-white hover:border-gray-400"
              >
                <option value="all">All Types</option>
                <option value="page_analysis">Page Analysis</option>
                <option value="ga_analysis">Google Analytics</option>
                <option value="survey_analysis">Survey Analysis</option>
                <option value="review_mining">Review Mining</option>
                <option value="onsite_poll">On-Site Poll</option>
                <option value="heatmap_analysis">Heatmap Analysis</option>
                <option value="user_testing">User Testing</option>
                <option value="competitor_analysis">Competitor Analysis</option>
                <option value="other">Other</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:border-brand-gold transition-all bg-white hover:border-gray-400"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {filteredAnalyses.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="heading-component mb-2">No analyses found</h3>
              <p className="text-body-secondary mb-6">
                {searchQuery ? 'Try adjusting your search or filters' : 'Run your first analysis to get started'}
              </p>
              {!searchQuery && (
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
                  style={{ boxShadow: '0 4px 12px rgba(245, 197, 66, 0.3)' }}
                >
                  Run New Analysis
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 text-body-secondary">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredAnalyses.length)} of {filteredAnalyses.length} analyses
            </div>

            <div className="grid gap-4">
              {paginatedAnalyses.map((analysis) => (
              <Link
                key={analysis.id}
                href={`/dashboard/results/${analysis.id}`}
                className="bg-white rounded-lg border border-gray-200 padding-container-md hover:shadow-lg hover:border-brand-gold/30 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-black px-2 py-1 ${RESEARCH_TYPE_COLORS[analysis.research_type]?.bg || 'bg-gray-100'} ${RESEARCH_TYPE_COLORS[analysis.research_type]?.text || 'text-gray-700'} rounded`}>
                        {RESEARCH_TYPE_ICONS[analysis.research_type] || 'OR'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-body-secondary font-bold text-brand-black group-hover:text-brand-gold transition-colors">
                            {analysis.name || analysis.url}
                          </h3>
                          <span className={`px-2 py-0.5 ${RESEARCH_TYPE_COLORS[analysis.research_type]?.bg || 'bg-gray-100'} ${RESEARCH_TYPE_COLORS[analysis.research_type]?.text || 'text-gray-700'} text-xs font-bold rounded`}>
                            {RESEARCH_TYPE_LABELS[analysis.research_type]}
                          </span>
                        </div>
                        <p className="text-caption mt-1">{analysis.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-caption">
                      <span>
                        <span className="font-bold">{analysis.insights_count || 0}</span> insights
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(analysis.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-black transition-all"
                >
                  ← Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current, and pages around current
                    const showPage = page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1);

                    if (!showPage) {
                      // Show ellipsis
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-3 py-2 text-gray-400">...</span>;
                      }
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          currentPage === page
                            ? 'bg-brand-black text-white'
                            : 'border-2 border-gray-300 hover:border-brand-black'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-black transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AllAnalysesPage() {
  return (
    <WorkspaceGuard>
      <AllAnalysesContent />
    </WorkspaceGuard>
  );
}
