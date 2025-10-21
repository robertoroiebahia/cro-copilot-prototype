'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import type { ResearchType } from '@/lib/types/insights.types';
import { RESEARCH_TYPE_LABELS, RESEARCH_TYPE_ICONS } from '@/lib/types/insights.types';

interface AnalysisDetailPageProps {
  params: {
    id: string;
  };
}

interface Analysis {
  id: string;
  url: string;
  name?: string;
  research_type: ResearchType;
  status: string;
  created_at: string;
  user_id: string;
}

interface Insight {
  id: string;
  insight_id: string;
  statement: string;
  research_type: ResearchType;
  confidence: 'high' | 'medium' | 'low';
  segment?: string;
  location?: string;
  growth_pillar?: string;
  evidence?: any;
  created_at: string;
}

interface Theme {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface Hypothesis {
  id: string;
  statement: string;
  expected_impact?: string;
  priority?: string;
  created_at: string;
}

export default function AnalysisDetailPage({ params }: AnalysisDetailPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysisData();
  }, [params.id]);

  const fetchAnalysisData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace('/login');
        return;
      }

      // Fetch analysis metadata
      const { data: analysisData, error: analysisError } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', params.id)
        .single();

      if (analysisError || !analysisData) {
        setError('Analysis not found');
        setLoading(false);
        return;
      }

      // Verify ownership
      if (analysisData.user_id !== user.id) {
        setError('You do not have access to this analysis');
        setLoading(false);
        return;
      }

      setAnalysis(analysisData);

      // Fetch insights from this analysis
      const { data: insightsData, error: insightsError } = await supabase
        .from('insights')
        .select('*')
        .eq('analysis_id', params.id)
        .order('created_at', { ascending: false });

      if (!insightsError && insightsData) {
        setInsights(insightsData);
      }

      // Fetch themes created from these insights
      // We'll fetch themes created around the same time as the analysis
      // and filter by user (since themes are user-specific)
      const analysisDate = new Date(analysisData.created_at);
      const startDate = new Date(analysisDate.getTime() - 60000); // 1 min before
      const endDate = new Date(analysisDate.getTime() + 300000); // 5 min after

      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (!themesError && themesData) {
        setThemes(themesData);
      }

      // Fetch hypotheses created from those themes (similar time window)
      const { data: hypothesesData, error: hypothesesError } = await supabase
        .from('hypotheses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (!hypothesesError && hypothesesData) {
        setHypotheses(hypothesesData);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching analysis:', err);
      setError(err.message || 'Failed to load analysis');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-brand-black mb-2">Error</h3>
          <p className="text-sm text-brand-text-secondary mb-6">{error || 'Analysis not found'}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold hover:bg-black text-black hover:text-white font-black rounded-lg transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const domain = (() => {
    try {
      return new URL(analysis.url).hostname.replace('www.', '');
    } catch {
      return analysis.url;
    }
  })();

  const formattedDate = new Date(analysis.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(analysis.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <nav className="flex items-center gap-2 text-sm mb-4">
            <Link href="/dashboard" className="text-brand-text-tertiary hover:text-brand-gold transition-all duration-200 font-bold">
              Dashboard
            </Link>
            <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/analyses" className="text-brand-text-tertiary hover:text-brand-gold transition-all duration-200 font-bold">
              All Analyses
            </Link>
            <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-brand-black font-black">{domain}</span>
          </nav>

          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black px-3 py-2 bg-blue-100 text-blue-700 rounded-lg">{RESEARCH_TYPE_ICONS[analysis.research_type] || 'OR'}</span>
                </div>
                <div>
                  <h1 className="text-3xl font-black text-brand-black">{analysis.name || domain}</h1>
                  <p className="text-sm text-brand-text-secondary mt-1">
                    {RESEARCH_TYPE_LABELS[analysis.research_type]} • {formattedDate} at {formattedTime}
                  </p>
                </div>
              </div>
              <a
                href={analysis.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-brand-gold hover:text-black transition-colors font-medium"
              >
                {analysis.url}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <span
              className={`px-3 py-1.5 text-sm font-bold rounded-lg ${
                analysis.status === 'completed'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : analysis.status === 'processing'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {analysis.status}
            </span>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-black text-brand-black mb-1">{insights.length}</div>
              <div className="text-xs font-bold text-brand-text-secondary">Insights Generated</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-black text-brand-black mb-1">{themes.length}</div>
              <div className="text-xs font-bold text-brand-text-secondary">Themes Created</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-black text-brand-black mb-1">{hypotheses.length}</div>
              <div className="text-xs font-bold text-brand-text-secondary">Hypotheses Generated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Insights Section - THE CORE! */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-xl font-black text-brand-black">Insights</h2>
            </div>
            <Link
              href="/insights"
              className="text-sm font-bold text-brand-gold hover:text-black transition-colors"
            >
              View All Insights →
            </Link>
          </div>

          {insights.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-brand-black mb-2">No Insights Yet</h3>
              <p className="text-sm text-brand-text-secondary">This analysis hasn't generated any insights yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-brand-gold/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <p className="text-base font-bold text-brand-black mb-2">{insight.statement}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                          {RESEARCH_TYPE_LABELS[insight.research_type]}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded-full ${
                            insight.confidence === 'high'
                              ? 'bg-green-100 text-green-700'
                              : insight.confidence === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {insight.confidence} confidence
                        </span>
                        {insight.growth_pillar && (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700">
                            {insight.growth_pillar}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(insight.segment || insight.location) && (
                    <div className="flex gap-4 text-xs text-brand-text-tertiary">
                      {insight.segment && (
                        <span>
                          <span className="font-bold">Segment:</span> {insight.segment}
                        </span>
                      )}
                      {insight.location && (
                        <span>
                          <span className="font-bold">Location:</span> {insight.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Themes Section */}
        {themes.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h2 className="text-xl font-black text-brand-black">Themes</h2>
              </div>
              <Link
                href="/themes"
                className="text-sm font-bold text-brand-gold hover:text-black transition-colors"
              >
                View All Themes →
              </Link>
            </div>
            <div className="space-y-3">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="p-4 bg-gradient-to-br from-brand-gold/5 to-yellow-50/50 rounded-lg border border-brand-gold/20"
                >
                  <h3 className="font-black text-base text-brand-black mb-1">{theme.name}</h3>
                  {theme.description && (
                    <p className="text-sm text-brand-text-secondary">{theme.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hypotheses Section */}
        {hypotheses.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h2 className="text-xl font-black text-brand-black">Hypotheses</h2>
              </div>
              <Link
                href="/hypotheses"
                className="text-sm font-bold text-brand-gold hover:text-black transition-colors"
              >
                View All Hypotheses →
              </Link>
            </div>
            <div className="space-y-3">
              {hypotheses.map((hypothesis) => (
                <div
                  key={hypothesis.id}
                  className="p-4 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <p className="text-sm font-bold text-brand-black mb-2 italic">"{hypothesis.statement}"</p>
                  {(hypothesis.expected_impact || hypothesis.priority) && (
                    <div className="flex gap-3 text-xs">
                      {hypothesis.expected_impact && (
                        <span className="text-brand-text-tertiary">
                          <span className="font-bold">Expected Impact:</span> {hypothesis.expected_impact}
                        </span>
                      )}
                      {hypothesis.priority && (
                        <span className="text-brand-text-tertiary">
                          <span className="font-bold">Priority:</span> {hypothesis.priority}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
