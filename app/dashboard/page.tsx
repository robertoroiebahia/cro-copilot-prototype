"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// Custom hook for hover state management
function useHover() {
  const [isHovered, setIsHovered] = useState(false);
  return {
    isHovered,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };
}

// Lightweight type for dashboard list (excludes heavy fields like screenshots)
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

  useEffect(() => {
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

      // First, ensure the profile exists
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating profile for user...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            email: currentUser.email || '',
          });

        if (insertError) {
          console.error('Failed to create profile:', insertError);
        }
      }

      // Fetch analyses for the current user (exclude large screenshot data)
      const { data, error: analysesError } = await supabase
        .from('analyses')
        .select('id, user_id, url, status, summary, usage, llm, created_at, updated_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (analysesError) {
        console.error('Failed to fetch analyses:', analysesError);
        setError(`Failed to load analyses: ${analysesError.message}`);
        setAnalyses([]);
      } else {
        setAnalyses(data ?? []);
      }

      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-brand-gray-medium border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white pt-16">{/* pt-16 accounts for fixed nav */}

      {/* Features Grid Section */}
      <div className="border-b border-brand-gray-border bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {/* Page Analyzer - Active */}
            <PageAnalyzerCard />

            {/* Research Hub - Coming Soon */}
            <div className="relative bg-brand-surface border border-brand-gray-border rounded p-6 opacity-50">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl grayscale">🧠</span>
                <div>
                  <h3 className="font-black text-brand-black text-lg">Research Hub</h3>
                  <p className="text-xs font-bold text-brand-text-tertiary uppercase tracking-wide">Coming Soon</p>
                </div>
              </div>
              <p className="text-sm text-brand-text-secondary font-medium">GA4, surveys & Playwright capture</p>
            </div>

            {/* Insight Engine - Coming Soon */}
            <div className="relative bg-brand-surface border border-brand-gray-border rounded p-6 opacity-50">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl grayscale">🧩</span>
                <div>
                  <h3 className="font-black text-brand-black text-lg">Insight Engine</h3>
                  <p className="text-xs font-bold text-brand-text-tertiary uppercase tracking-wide">Coming Soon</p>
                </div>
              </div>
              <p className="text-sm text-brand-text-secondary font-medium">Clusters friction themes across sources</p>
            </div>

            {/* Test Generator - Coming Soon */}
            <div className="relative bg-brand-surface border border-brand-gray-border rounded p-6 opacity-50">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl grayscale">🧪</span>
                <div>
                  <h3 className="font-black text-brand-black text-lg">Test Generator</h3>
                  <p className="text-xs font-bold text-brand-text-tertiary uppercase tracking-wide">Coming Soon</p>
                </div>
              </div>
              <p className="text-sm text-brand-text-secondary font-medium">Insights → structured hypotheses</p>
            </div>

            {/* Experiment Tracker - Coming Soon */}
            <div className="relative bg-brand-surface border border-brand-gray-border rounded p-6 opacity-50">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl grayscale">📊</span>
                <div>
                  <h3 className="font-black text-brand-black text-lg">Experiment Tracker</h3>
                  <p className="text-xs font-bold text-brand-text-tertiary uppercase tracking-wide">Coming Soon</p>
                </div>
              </div>
              <p className="text-sm text-brand-text-secondary font-medium">A/B tests, variants & KPIs</p>
            </div>

            {/* Learning Memory - Coming Soon */}
            <div className="relative bg-brand-surface border border-brand-gray-border rounded p-6 opacity-50">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl grayscale">📘</span>
                <div>
                  <h3 className="font-black text-brand-black text-lg">Learning Memory</h3>
                  <p className="text-xs font-bold text-brand-text-tertiary uppercase tracking-wide">Coming Soon</p>
                </div>
              </div>
              <p className="text-sm text-brand-text-secondary font-medium">Knowledge graph of wins & losses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Analyses Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-brand-black">Recent Analyses</h2>
            <p className="text-sm text-brand-text-secondary mt-1 font-medium">
              {analyses?.length || 0} total {analyses?.length === 1 ? 'analysis' : 'analyses'}
            </p>
          </div>
          <NewAnalysisButton />
        </div>

        {/* Analyses Grid */}
        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/50 rounded p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-brand-danger flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-brand-danger mb-1">Error Loading Analyses</h3>
                <p className="text-sm text-brand-danger/80">{error}</p>
                <p className="text-xs text-brand-danger/60 mt-2">Check the browser console for more details.</p>
              </div>
            </div>
          </div>
        )}

        {!analyses || analyses.length === 0 ? (
          <div className="bg-brand-surface border border-brand-gray-border rounded p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-brand-gray-medium rounded flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-brand-black mb-2">
                No analyses yet
              </h3>
              <p className="text-sm sm:text-base text-brand-text-secondary mb-6 font-medium">
                Start by analyzing your first landing page to get CRO insights and
                recommendations.
              </p>
              <AnalyzeFirstPageButton />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {analyses.map((analysis) => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Page Analyzer Card Component
function PageAnalyzerCard() {
  const hover = useHover();

  return (
    <Link
      href="/analyze"
      className="relative border-brand-gold border rounded p-6 transition-all duration-300 overflow-hidden"
      style={{
        backgroundColor: '#FAFAFA',
        transform: hover.isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hover.isHovered
          ? '0 20px 50px -10px rgba(245, 197, 66, 0.5), 0 0 0 2px rgba(245, 197, 66, 0.6), 0 8px 20px rgba(0, 0, 0, 0.25)'
          : '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h3 className="font-black text-brand-black text-lg">Page Analyzer</h3>
            <p className="text-xs font-bold text-brand-black/70 uppercase tracking-wide">Active</p>
          </div>
        </div>
        <p className="text-sm text-brand-black font-medium">Visual + contextual page analysis</p>
      </div>
    </Link>
  );
}

// New Analysis Button Component
function NewAnalysisButton() {
  const hover = useHover();

  return (
    <Link
      href="/analyze"
      className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-black rounded transition-all duration-300"
      style={{
        backgroundColor: hover.isHovered ? '#1A1A1A' : '#0E0E0E',
        transform: hover.isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hover.isHovered
          ? '0 20px 50px -10px rgba(212, 165, 116, 0.6), 0 0 0 2px rgba(212, 165, 116, 0.4), 0 8px 20px rgba(0, 0, 0, 0.25)'
          : '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)',
      }}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      New Analysis
    </Link>
  );
}

// Analyze First Page Button Component
function AnalyzeFirstPageButton() {
  const hover = useHover();

  return (
    <Link
      href="/analyze"
      className="inline-flex items-center gap-2 px-6 py-3 text-white text-sm font-black rounded transition-all duration-300"
      style={{
        backgroundColor: hover.isHovered ? '#1A1A1A' : '#0E0E0E',
        transform: hover.isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hover.isHovered
          ? '0 20px 50px -10px rgba(212, 165, 116, 0.6), 0 0 0 2px rgba(212, 165, 116, 0.4), 0 8px 20px rgba(0, 0, 0, 0.25)'
          : '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)',
      }}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Analyze Your First Page
    </Link>
  );
}

function AnalysisCard({ analysis }: { analysis: DashboardAnalysis }) {
  const hover = useHover();
  const createdAt = new Date(analysis.created_at);
  const formattedDate = createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = createdAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Extract domain from URL
  const domain = (() => {
    try {
      return new URL(analysis.url).hostname.replace('www.', '');
    } catch {
      return analysis.url;
    }
  })();

  // Get status color
  const statusColor = {
    completed: '#10B981',
    processing: '#F5C542',
    failed: '#EF4444',
  }[analysis.status] || '#A3A3A3';

  // Get confidence color
  const confidenceColor = analysis.summary?.confidence
    ? {
        high: '#10B981',
        medium: '#F5C542',
        low: '#EF4444',
      }[analysis.summary.confidence]
    : '#A3A3A3';

  return (
    <Link
      href={`/dashboard/results/${analysis.id}`}
      className="group block bg-white rounded border border-brand-gray-border transition-all duration-300 p-6 relative overflow-hidden"
      style={{
        transform: hover.isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover.isHovered
          ? '0 8px 24px -4px rgba(212, 165, 116, 0.3), 0 0 0 1px rgba(212, 165, 116, 0.2), 0 6px 16px rgba(0, 0, 0, 0.15)'
          : '0 3px 12px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0, 0, 0, 0.1)',
      }}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
    >
      {/* Gold accent bar on top */}
      <div
        className="absolute top-0 left-0 w-full h-1 transition-all duration-300"
        style={{
          backgroundColor: hover.isHovered ? '#F5C542' : 'rgba(245, 197, 66, 0.3)',
        }}
      />

      {/* Header: Domain with status indicator */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
          style={{ backgroundColor: statusColor }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-lg text-brand-black mb-1 truncate group-hover:text-brand-gold transition-colors" title={analysis.url}>
            {domain}
          </h3>
          <p className="text-xs text-brand-text-tertiary truncate">
            {analysis.url}
          </p>
        </div>
      </div>

      {/* Summary Headline */}
      {analysis.summary?.headline && (
        <p className="text-sm text-brand-text-secondary mb-4 line-clamp-2 leading-relaxed">
          {analysis.summary.headline}
        </p>
      )}

      {/* Footer: Metadata */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-brand-gray-border">
        <div className="flex items-center gap-3 text-xs text-brand-text-tertiary">
          {/* Date */}
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{formattedDate}</span>
          </div>

          {/* Confidence */}
          {analysis.summary?.confidence && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: confidenceColor }}
              />
              <span className="font-bold capitalize">{analysis.summary.confidence}</span>
            </div>
          )}
        </div>

        {/* View arrow */}
        <div className="flex items-center gap-1 text-xs font-black text-brand-text-tertiary group-hover:text-brand-gold transition-colors">
          <span>View</span>
          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
