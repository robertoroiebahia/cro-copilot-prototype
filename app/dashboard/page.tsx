import { createClient, createActionClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Analysis } from '@/lib/types/database.types';

export default async function DashboardPage() {
  const supabase = createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user's analyses
  const { data: analyses, error: analysesError } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false });

  if (analysesError) {
    console.error('Failed to fetch analyses:', analysesError);
  }

  const handleSignOut = async () => {
    'use server';
    const supabase = createActionClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/analyze"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              New Analysis
            </Link>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Analyses</h2>
          <p className="text-gray-600 mt-1">
            {analyses?.length || 0} landing page{' '}
            {analyses?.length === 1 ? 'analysis' : 'analyses'}
          </p>
        </div>

        {/* Analyses Grid */}
        {!analyses || analyses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No analyses yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start by analyzing your first landing page to get CRO insights and
                recommendations.
              </p>
              <Link
                href="/analyze"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Analyze Your First Page
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {analyses.map((analysis) => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: Analysis }) {
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
      href={`/dashboard/${analysis.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
    >
      {/* Status and Date */}
      <div className="flex justify-between items-start mb-3">
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusBadge}`}
        >
          {analysis.status}
        </span>
        <span className="text-xs text-gray-500">
          {formattedDate} at {formattedTime}
        </span>
      </div>

      {/* URL */}
      <h3 className="font-semibold text-gray-900 mb-1 truncate" title={analysis.url}>
        {domain}
      </h3>
      <p className="text-sm text-gray-600 mb-4 truncate">{analysis.url}</p>

      {/* Summary Headline */}
      {analysis.summary?.headline && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
          {analysis.summary.headline}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          {analysis.summary?.confidence && (
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded ${confidenceBadge}`}
            >
              {analysis.summary.confidence} confidence
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {analysis.usage?.totalTokens?.toLocaleString() || 0} tokens
        </span>
      </div>
    </Link>
  );
}
