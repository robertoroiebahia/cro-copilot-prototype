import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Analysis } from '@/lib/types/database.types';

interface AnalysisDetailPageProps {
  params: {
    id: string;
  };
}

export default async function AnalysisDetailPage({
  params,
}: AnalysisDetailPageProps) {
  const supabase = createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch specific analysis
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', params.id)
    .single();

  if (analysisError || !analysis) {
    notFound();
  }

  // Verify ownership (RLS should handle this, but double check)
  if (analysis.user_id !== user.id) {
    notFound();
  }

  const createdAt = new Date(analysis.created_at);
  const formattedDate = createdAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = createdAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Extract domain
  const domain = (() => {
    try {
      return new URL(analysis.url).hostname.replace('www.', '');
    } catch {
      return analysis.url;
    }
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {domain}
              </h1>
              <a
                href={analysis.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all inline-flex items-center gap-1"
              >
                {analysis.url}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="text-sm text-gray-500 mt-2">
                Analyzed on {formattedDate} at {formattedTime}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                analysis.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : analysis.status === 'processing'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {analysis.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Summary Section */}
        {analysis.summary && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm p-8 mb-6 border border-blue-100">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Analysis Summary</h2>
                <p className="text-gray-800 text-base leading-relaxed mb-4">
                  {analysis.summary.headline}
                </p>
                <div className="flex gap-3">
                  <span className="text-xs px-3 py-1.5 bg-white text-gray-700 rounded-full font-medium border border-gray-200">
                    Tone: {analysis.summary.diagnosticTone}
                  </span>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                    analysis.summary.confidence === 'high'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : analysis.summary.confidence === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {analysis.summary.confidence} confidence
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metrics & Context Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Metrics Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
            </div>
            <dl className="space-y-4">
              <div className="flex justify-between items-center">
                <dt className="text-sm text-gray-600">Visitors</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {Number(analysis.metrics.visitors).toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-sm text-gray-600">Add to Carts</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {Number(analysis.metrics.addToCarts).toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-sm text-gray-600">Purchases</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {Number(analysis.metrics.purchases).toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <dt className="text-sm text-gray-600">Average Order Value</dt>
                <dd className="text-lg font-semibold text-green-600">
                  ${Number(analysis.metrics.aov).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Context Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Context</h3>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-600 mb-1">Traffic Source</dt>
                <dd className="text-base font-medium text-gray-900 px-3 py-2 bg-gray-50 rounded border border-gray-200">
                  {analysis.context.trafficSource}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Product Type</dt>
                <dd className="text-base font-medium text-gray-900 px-3 py-2 bg-gray-50 rounded border border-gray-200">
                  {analysis.context.productType}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Price Point</dt>
                <dd className="text-base font-medium text-gray-900 px-3 py-2 bg-gray-50 rounded border border-gray-200">
                  {analysis.context.pricePoint}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Optimization Roadmap */}
        {analysis.roadmap && Array.isArray(analysis.roadmap) && analysis.roadmap.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Optimization Roadmap</h3>
            </div>
            <div className="space-y-4">
              {analysis.roadmap.map((item: any, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-base flex-1 pr-4">
                      {item.title}
                    </h4>
                    {item.focusArea && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full flex-shrink-0 bg-blue-100 text-blue-800 ring-1 ring-blue-200">
                        {item.focusArea}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Impact:</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        item.impact === 'High'
                          ? 'bg-green-100 text-green-800'
                          : item.impact === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.impact}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Effort:</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        item.effort === 'Low'
                          ? 'bg-green-100 text-green-800'
                          : item.effort === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.effort}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Expected Lift:</span>
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                        {item.expectedLift}
                      </span>
                    </div>
                  </div>
                    {item.notes && (
                      <p className="text-sm text-gray-600 leading-relaxed mb-2">
                        {item.notes}
                      </p>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Sections in Tabs/Accordion Style */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Detailed Analysis</h3>
            </div>
          </div>

          {/* Above the Fold */}
          {analysis.above_the_fold && (
            <details className="border-b border-gray-200 last:border-b-0">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors font-medium text-gray-900">
                Above the Fold Analysis
              </summary>
              <div className="px-6 py-4 bg-gray-50">
                <AnalysisContent data={analysis.above_the_fold} />
              </div>
            </details>
          )}

          {/* Below the Fold */}
          {analysis.below_the_fold && (
            <details className="border-b border-gray-200 last:border-b-0">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors font-medium text-gray-900">
                Below the Fold Analysis
              </summary>
              <div className="px-6 py-4 bg-gray-50">
                <AnalysisContent data={analysis.below_the_fold} />
              </div>
            </details>
          )}

          {/* Full Page */}
          {analysis.full_page && (
            <details className="border-b border-gray-200 last:border-b-0">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors font-medium text-gray-900">
                Full Page Analysis
              </summary>
              <div className="px-6 py-4 bg-gray-50">
                <AnalysisContent data={analysis.full_page} />
              </div>
            </details>
          )}

          {/* Strategic Extensions */}
          {analysis.strategic_extensions && (
            <details className="border-b border-gray-200 last:border-b-0">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors font-medium text-gray-900">
                Strategic Extensions
              </summary>
              <div className="px-6 py-4 bg-gray-50">
                <AnalysisContent data={analysis.strategic_extensions} />
              </div>
            </details>
          )}

          {/* Vision Analysis */}
          {analysis.vision_analysis && (
            <details className="border-b border-gray-200 last:border-b-0">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors font-medium text-gray-900">
                Vision AI Analysis
              </summary>
              <div className="px-6 py-4 bg-gray-50">
                <AnalysisContent data={analysis.vision_analysis} />
              </div>
            </details>
          )}
        </div>

        {/* Usage Stats */}
        {analysis.usage && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <dt className="text-sm text-gray-600 mb-2">Total Tokens</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {analysis.usage.totalTokens?.toLocaleString() || 0}
                </dd>
              </div>
              <div className="text-center">
                <dt className="text-sm text-gray-600 mb-2">Vision Tokens</dt>
                <dd className="text-2xl font-bold text-blue-600">
                  {((analysis.usage.visionInputTokens || 0) +
                    (analysis.usage.visionOutputTokens || 0)).toLocaleString()}
                </dd>
              </div>
              <div className="text-center">
                <dt className="text-sm text-gray-600 mb-2">Analysis Tokens</dt>
                <dd className="text-2xl font-bold text-purple-600">
                  {((analysis.usage.analysisInputTokens || 0) +
                    (analysis.usage.analysisOutputTokens || 0)).toLocaleString()}
                </dd>
              </div>
              <div className="text-center">
                <dt className="text-sm text-gray-600 mb-2">Estimated Cost</dt>
                <dd className="text-2xl font-bold text-green-600">
                  ${(analysis.usage.estimatedCost || 0).toFixed(4)}
                </dd>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AnalysisContent({ data }: { data: any }) {
  return (
    <div className="prose prose-sm max-w-none">
      <pre className="bg-white rounded-lg p-4 text-xs overflow-x-auto border border-gray-200 font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
