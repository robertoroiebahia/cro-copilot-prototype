"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">{/* pt-16 accounts for fixed nav */}

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Analyses</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {analyses?.length || 0} landing page{' '}
                {analyses?.length === 1 ? 'analysis' : 'analyses'}
              </p>
            </div>
            <Link
              href="/analyze"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Analysis
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Analyses Grid */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Error Loading Analyses</h3>
                <p className="text-sm text-red-700">{error}</p>
                <p className="text-xs text-red-600 mt-2">Check the browser console for more details.</p>
              </div>
            </div>
          </div>
        )}

        {!analyses || analyses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                No analyses yet
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Start by analyzing your first landing page to get CRO insights and
                recommendations.
              </p>
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Analyze Your First Page
              </Link>
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

function AnalysisCard({ analysis }: { analysis: DashboardAnalysis }) {
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

  // Get status badge
  const statusBadge = {
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  }[analysis.status];

  // Get confidence badge color
  const confidenceBadge = analysis.summary?.confidence
    ? {
        high: 'bg-green-100 text-green-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-red-100 text-red-800',
      }[analysis.summary.confidence]
    : 'bg-gray-100 text-gray-800';

  return (
    <Link
      href={`/dashboard/results/${analysis.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-4 sm:p-6 border border-gray-100 hover:border-blue-200"
    >
      {/* Header: Status and Date */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
        <span
          className={`inline-flex self-start px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge}`}
        >
          {analysis.status}
        </span>
        <span className="text-xs text-gray-500 sm:text-right">
          {formattedDate}
          <span className="hidden sm:inline"> at {formattedTime}</span>
        </span>
      </div>

      {/* Domain & URL */}
      <div className="mb-3">
        <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-1 truncate" title={analysis.url}>
          {domain}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 truncate">{analysis.url}</p>
      </div>

      {/* Summary Headline */}
      {analysis.summary?.headline && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-2 min-h-[2.5rem]">
          {analysis.summary.headline}
        </p>
      )}

      {/* Metadata Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-gray-100">
        <div className="flex gap-2 flex-wrap">
          {analysis.summary?.confidence && (
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${confidenceBadge}`}
            >
              {analysis.summary.confidence}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{analysis.usage?.totalTokens?.toLocaleString() || 0} tokens</span>
        </div>
      </div>
    </Link>
  );
}
