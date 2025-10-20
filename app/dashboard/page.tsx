"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// Enhanced type with new fields
interface DashboardAnalysis {
  id: string;
  user_id: string;
  url: string;
  status: string;
  summary?: {
    headline?: string;
    confidence?: 'high' | 'medium' | 'low';
  };
  usage?: {
    totalTokens?: number;
  };
  llm?: string | null;
  tags: string[];
  is_starred: boolean;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<any>(null);
  const [analyses, setAnalyses] = useState<DashboardAnalysis[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'starred' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'confidence'>('newest');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user: currentUser },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);

    // Ensure profile exists
    const { error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', currentUser.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          email: currentUser.email || '',
        });
    }

    // Fetch analyses
    const { data, error: analysesError } = await supabase
      .from('analyses')
      .select('id, user_id, url, status, summary, usage, llm, tags, is_starred, notes, archived_at, created_at, updated_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (analysesError) {
      setError(`Failed to load analyses: ${analysesError.message}`);
      setAnalyses([]);
    } else {
      setAnalyses(data ?? []);
    }

    setLoading(false);
  };

  // Filter and search analyses
  const filteredAnalyses = useMemo(() => {
    if (!analyses) return [];

    let filtered = analyses;

    // Apply filter
    if (selectedFilter === 'starred') {
      filtered = filtered.filter(a => a.is_starred);
    } else if (selectedFilter === 'archived') {
      filtered = filtered.filter(a => a.archived_at !== null);
    } else {
      // 'all' shows only non-archived
      filtered = filtered.filter(a => a.archived_at === null);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.url.toLowerCase().includes(query) ||
        a.summary?.headline?.toLowerCase().includes(query) ||
        a.tags.some(tag => tag.toLowerCase().includes(query))
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
        const aConf = confScore[a.summary?.confidence || 'low'];
        const bConf = confScore[b.summary?.confidence || 'low'];
        return bConf - aConf;
      }
      return 0;
    });

    return filtered;
  }, [analyses, searchQuery, selectedFilter, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!analyses) return { total: 0, completed: 0, starred: 0, avgConfidence: 0 };

    const nonArchived = analyses.filter(a => !a.archived_at);
    const completed = nonArchived.filter(a => a.status === 'completed');
    const starred = nonArchived.filter(a => a.is_starred);

    // Calculate average confidence
    const confidenceScores = completed
      .filter(a => a.summary?.confidence)
      .map(a => {
        const conf = a.summary!.confidence!;
        return conf === 'high' ? 3 : conf === 'medium' ? 2 : 1;
      });

    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;

    return {
      total: nonArchived.length,
      completed: completed.length,
      starred: starred.length,
      avgConfidence: avgConfidence,
    };
  }, [analyses]);

  const toggleStar = async (id: string, currentlyStarred: boolean) => {
    try {
      const { error } = await supabase
        .from('analyses')
        .update({ is_starred: !currentlyStarred })
        .eq('id', id);

      if (!error) {
        setAnalyses(prev =>
          prev!.map(a => a.id === id ? { ...a, is_starred: !currentlyStarred } : a)
        );
      }
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-brand-black mb-2">Analyses</h1>
              <p className="text-sm text-brand-text-secondary font-medium">
                Track and manage your CRO analysis results
              </p>
            </div>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Analysis
            </Link>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Analyses"
              value={stats.total}
              icon={(
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              color="blue"
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              icon={(
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              color="green"
            />
            <StatCard
              label="Starred"
              value={stats.starred}
              icon={(
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
              color="yellow"
            />
            <StatCard
              label="Avg Confidence"
              value={stats.avgConfidence > 0 ? `${Math.round(stats.avgConfidence * 33)}%` : 'N/A'}
              icon={(
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by URL, headline, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  selectedFilter === 'all'
                    ? 'bg-brand-gold text-brand-black'
                    : 'bg-gray-100 text-brand-text-secondary hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFilter('starred')}
                className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                  selectedFilter === 'starred'
                    ? 'bg-brand-gold text-brand-black'
                    : 'bg-gray-100 text-brand-text-secondary hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill={selectedFilter === 'starred' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Starred
              </button>
              <button
                onClick={() => setSelectedFilter('archived')}
                className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  selectedFilter === 'archived'
                    ? 'bg-brand-gold text-brand-black'
                    : 'bg-gray-100 text-brand-text-secondary hover:bg-gray-200'
                }`}
              >
                Archived
              </button>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-brand-gold transition-all bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="confidence">Highest Confidence</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-bold text-red-900 mb-1">Error Loading Analyses</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
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
              <h3 className="text-xl font-black text-brand-black mb-2">
                {selectedFilter === 'starred' ? 'No starred analyses' :
                 selectedFilter === 'archived' ? 'No archived analyses' :
                 searchQuery ? 'No analyses found' :
                 'No analyses yet'}
              </h3>
              <p className="text-sm text-brand-text-secondary mb-6">
                {searchQuery ? 'Try adjusting your search query' :
                 selectedFilter !== 'all' ? 'Try selecting a different filter' :
                 'Start by analyzing your first landing page to get CRO insights'}
              </p>
              {!searchQuery && selectedFilter === 'all' && (
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Analyze Your First Page
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredAnalyses.map((analysis) => (
              <EnhancedAnalysisCard
                key={analysis.id}
                analysis={analysis}
                onToggleStar={toggleStar}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon, color }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colors = {
    blue: 'from-blue-50 to-blue-100/50 text-blue-600 border-blue-200',
    green: 'from-green-50 to-green-100/50 text-green-600 border-green-200',
    yellow: 'from-yellow-50 to-yellow-100/50 text-yellow-600 border-yellow-200',
    purple: 'from-purple-50 to-purple-100/50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-3">
        <div className={colors[color].split(' ')[2]}>{icon}</div>
      </div>
      <div className="text-3xl font-black text-brand-black mb-1">{value}</div>
      <div className="text-sm font-bold text-brand-text-secondary">{label}</div>
    </div>
  );
}

// Enhanced Analysis Card
function EnhancedAnalysisCard({ analysis, onToggleStar }: {
  analysis: DashboardAnalysis;
  onToggleStar: (id: string, currentlyStarred: boolean) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const createdAt = new Date(analysis.created_at);
  const formattedDate = createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const domain = (() => {
    try {
      return new URL(analysis.url).hostname.replace('www.', '');
    } catch {
      return analysis.url;
    }
  })();

  const statusColor = {
    completed: 'bg-green-100 text-green-700 border-green-200',
    processing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
  }[analysis.status] || 'bg-gray-100 text-gray-700 border-gray-200';

  const confidenceColor = analysis.summary?.confidence
    ? {
        high: 'bg-green-100 text-green-700',
        medium: 'bg-yellow-100 text-yellow-700',
        low: 'bg-red-100 text-red-700',
      }[analysis.summary.confidence]
    : 'bg-gray-100 text-gray-700';

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl hover:border-brand-gold/30 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Star Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleStar(analysis.id, analysis.is_starred);
        }}
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-all z-10"
      >
        <svg
          className={`w-5 h-5 transition-colors ${
            analysis.is_starred ? 'fill-yellow-400 stroke-yellow-400' : 'fill-none stroke-gray-400 hover:stroke-yellow-400'
          }`}
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>

      <Link href={`/dashboard/results/${analysis.id}`} className="block">
        {/* Status & Confidence Badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2.5 py-1 rounded text-xs font-bold border ${statusColor}`}>
            {analysis.status}
          </span>
          {analysis.summary?.confidence && (
            <span className={`px-2.5 py-1 rounded text-xs font-bold ${confidenceColor}`}>
              {analysis.summary.confidence} confidence
            </span>
          )}
        </div>

        {/* Domain */}
        <h3 className="text-lg font-black text-brand-black mb-2 group-hover:text-brand-gold transition-colors pr-8">
          {domain}
        </h3>

        {/* Headline */}
        {analysis.summary?.headline && (
          <p className="text-sm text-brand-text-secondary mb-4 line-clamp-2 leading-relaxed">
            {analysis.summary.headline}
          </p>
        )}

        {/* Tags */}
        {analysis.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {analysis.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-brand-gold/10 text-brand-gold text-xs font-bold rounded border border-brand-gold/20"
              >
                {tag}
              </span>
            ))}
            {analysis.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                +{analysis.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-brand-text-tertiary">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1 font-black text-brand-gold group-hover:translate-x-1 transition-transform">
            <span>View</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}
