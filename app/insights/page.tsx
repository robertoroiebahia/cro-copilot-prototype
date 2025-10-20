'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import type { Insight } from '@/lib/types/insights.types';

export default function InsightsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConfidence, setSelectedConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedPillar, setSelectedPillar] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'confidence'>('newest');

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);

    // Fetch all insights for user's analyses
    const { data, error: insightsError } = await supabase
      .from('insights')
      .select(`
        *,
        analyses!inner(user_id, url)
      `)
      .eq('analyses.user_id', currentUser.id)
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

    // Apply confidence filter
    if (selectedConfidence !== 'all') {
      filtered = filtered.filter(i => i.confidence === selectedConfidence);
    }

    // Apply pillar filter
    if (selectedPillar !== 'all') {
      filtered = filtered.filter(i => i.growth_pillar === selectedPillar);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.statement.toLowerCase().includes(query) ||
        i.segment?.toLowerCase().includes(query) ||
        i.location?.toLowerCase().includes(query)
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
        return confScore[b.confidence] - confScore[a.confidence];
      }
      return 0;
    });

    return filtered;
  }, [insights, searchQuery, selectedConfidence, selectedPillar, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = insights.length;
    const highConf = insights.filter(i => i.confidence === 'high').length;
    const mediumConf = insights.filter(i => i.confidence === 'medium').length;
    const lowConf = insights.filter(i => i.confidence === 'low').length;

    const pillars = ['Conversion', 'Spend', 'Frequency', 'Merchandise'];
    const pillarCounts = pillars.map(p => ({
      name: p,
      count: insights.filter(i => i.growth_pillar === p).length
    }));

    return { total, highConf, mediumConf, lowConf, pillarCounts };
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-brand-black mb-2">💡 Insights</h1>
              <p className="text-sm text-brand-text-secondary font-medium">
                Atomic observations with evidence from your analyses
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-black text-brand-black mb-1">{stats.total}</div>
              <div className="text-xs font-bold text-brand-text-secondary">Total Insights</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-black text-brand-black mb-1">{stats.highConf}</div>
              <div className="text-xs font-bold text-brand-text-secondary">High Confidence</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-black text-brand-black mb-1">{stats.mediumConf}</div>
              <div className="text-xs font-bold text-brand-text-secondary">Medium Confidence</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-black text-brand-black mb-1">{stats.lowConf}</div>
              <div className="text-xs font-bold text-brand-text-secondary">Low Confidence</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search insights by statement, segment, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedConfidence}
                onChange={(e) => setSelectedConfidence(e.target.value as any)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-brand-gold transition-all bg-white"
              >
                <option value="all">All Confidence</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={selectedPillar}
                onChange={(e) => setSelectedPillar(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-brand-gold transition-all bg-white"
              >
                <option value="all">All Pillars</option>
                <option value="Conversion">Conversion</option>
                <option value="Spend">Spend</option>
                <option value="Frequency">Frequency</option>
                <option value="Merchandise">Merchandise</option>
              </select>

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
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {filteredInsights.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-brand-black mb-2">No insights found</h3>
              <p className="text-sm text-brand-text-secondary mb-6">
                {searchQuery ? 'Try adjusting your search or filters' : 'Run an analysis to generate insights'}
              </p>
              {!searchQuery && (
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Analysis
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {filteredInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Insight Card Component
function InsightCard({ insight }: { insight: Insight }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const confidenceColor = {
    high: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-red-100 text-red-700 border-red-200',
  }[insight.confidence];

  const pillarColor = {
    Conversion: 'bg-blue-100 text-blue-700',
    Spend: 'bg-purple-100 text-purple-700',
    Frequency: 'bg-orange-100 text-orange-700',
    Merchandise: 'bg-pink-100 text-pink-700',
  }[insight.growth_pillar || 'Conversion'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-brand-gold/30 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-brand-gold/10 text-brand-gold text-xs font-black rounded border border-brand-gold/20">
            {insight.insight_id}
          </span>
          <span className={`px-2.5 py-1 rounded text-xs font-bold border ${confidenceColor}`}>
            {insight.confidence} confidence
          </span>
        </div>
      </div>

      {/* Statement */}
      <p className="text-sm text-brand-black font-bold mb-4 leading-relaxed">
        {insight.statement}
      </p>

      {/* Meta Info */}
      <div className="flex flex-wrap gap-2 mb-4">
        {insight.segment && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded">
            👥 {insight.segment}
          </span>
        )}
        {insight.location && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded">
            📍 {insight.location}
          </span>
        )}
        {insight.growth_pillar && (
          <span className={`px-2 py-1 text-xs font-bold rounded ${pillarColor}`}>
            {insight.growth_pillar}
          </span>
        )}
      </div>

      {/* Evidence Section */}
      {insight.evidence && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-bold text-brand-text-secondary hover:text-brand-gold transition-colors mb-2"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {isExpanded ? 'Hide' : 'Show'} Evidence
          </button>

          {isExpanded && (
            <div className="space-y-3">
              {insight.evidence.quantitative && (
                <div className="bg-blue-50 rounded p-3">
                  <div className="text-xs font-black text-blue-900 mb-2">Quantitative</div>
                  <div className="text-sm text-blue-800">
                    <div><span className="font-bold">{insight.evidence.quantitative.metric}:</span> {insight.evidence.quantitative.value}</div>
                    {insight.evidence.quantitative.sample_size && (
                      <div className="text-xs mt-1">Sample: {insight.evidence.quantitative.sample_size} users</div>
                    )}
                  </div>
                </div>
              )}

              {insight.evidence.qualitative && insight.evidence.qualitative.quotes && insight.evidence.qualitative.quotes.length > 0 && (
                <div className="bg-purple-50 rounded p-3">
                  <div className="text-xs font-black text-purple-900 mb-2">Qualitative</div>
                  {insight.evidence.qualitative.quotes.slice(0, 2).map((quote, idx) => (
                    <div key={idx} className="text-sm text-purple-800 italic mb-1">"{quote}"</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
        <button className="flex-1 px-3 py-2 bg-green-50 text-green-700 text-xs font-bold rounded hover:bg-green-100 transition-colors">
          ✓ Validate
        </button>
        <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded hover:bg-gray-200 transition-colors">
          Group to Theme
        </button>
      </div>
    </div>
  );
}
