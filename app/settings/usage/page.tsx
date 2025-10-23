'use client';

import { useEffect, useState } from 'react';
import { useSubscription } from '@/lib/billing/useSubscription';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import { useWorkspace } from '@/components/WorkspaceContext';
import Link from 'next/link';

interface UsageData {
  analyses_count: number;
  insights_count: number;
  themes_count: number;
  hypotheses_count: number;
  experiments_count: number;
  analyses_by_type: {
    page_analysis: number;
    ga4_analysis: number;
    survey_analysis: number;
    review_mining: number;
    onsite_poll: number;
    heatmap_analysis: number;
    user_testing: number;
    other: number;
  };
}

function UsageContent() {
  const { subscription, loading: subLoading, isPro } = useSubscription();
  const { selectedWorkspace } = useWorkspace();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      if (!selectedWorkspace?.id) return;

      try {
        const response = await fetch(`/api/usage?workspaceId=${selectedWorkspace.id}`);
        if (response.ok) {
          const data = await response.json();
          setUsage(data);
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [selectedWorkspace?.id]);

  const calculatePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (subLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading usage data...</p>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('Usage page - subscription:', subscription);
  console.log('Usage page - loading states:', { subLoading, loading });
  console.log('Usage page - workspace:', selectedWorkspace);

  if (!subscription) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-brand-black mb-2">Unable to Load Subscription</h2>
          <p className="text-brand-text-secondary mb-4">
            Please try refreshing the page or contact support if the issue persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const limits = subscription.limits;
  const currentUsage = usage || {
    analyses_count: 0,
    insights_count: 0,
    themes_count: 0,
    hypotheses_count: 0,
    experiments_count: 0,
    analyses_by_type: {
      page_analysis: 0,
      ga4_analysis: 0,
      survey_analysis: 0,
      review_mining: 0,
      onsite_poll: 0,
      heatmap_analysis: 0,
      user_testing: 0,
      other: 0,
    },
  };

  const usageMetrics = [
    {
      label: 'Analyses',
      icon: '📊',
      current: currentUsage.analyses_count,
      limit: limits.analyses_per_month,
      color: 'blue',
      period: 'per month',
    },
    {
      label: 'Insights',
      icon: '💡',
      current: currentUsage.insights_count,
      limit: limits.insights_max,
      color: 'yellow',
      period: 'total',
    },
    {
      label: 'Themes',
      icon: '🎯',
      current: currentUsage.themes_count,
      limit: limits.themes_max,
      color: 'emerald',
      period: 'total',
    },
    {
      label: 'Hypotheses',
      icon: '🔬',
      current: currentUsage.hypotheses_count,
      limit: limits.hypotheses_max,
      color: 'violet',
      period: 'total',
    },
    {
      label: 'Experiments',
      icon: '🧪',
      current: currentUsage.experiments_count,
      limit: limits.experiments_per_month,
      color: 'orange',
      period: 'per month',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-brand-black mb-1">
              Current Usage
            </h2>
            <p className="text-sm text-brand-text-secondary">
              Track your usage across all features
            </p>
          </div>
          <div className="px-4 py-2 bg-white rounded-lg border border-purple-300 shadow-sm">
            <div className="text-xs font-black text-gray-500 uppercase tracking-wide">Billing Period</div>
            <div className="text-sm font-black text-brand-black">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {!isPro && (
          <div className="bg-white/70 backdrop-blur rounded-lg p-4 border border-purple-300">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-black text-purple-900 mb-1">Upgrade for More</h4>
                <p className="text-xs text-purple-800 mb-2">
                  Get 10x more analyses and unlimited insights with Pro
                </p>
                <Link
                  href="/settings/billing"
                  className="inline-block px-3 py-1.5 bg-brand-gold text-brand-black text-xs font-black rounded-lg hover:bg-yellow-500 transition-all"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {usageMetrics.map((metric) => {
          const percentage = calculatePercentage(metric.current, metric.limit);
          const progressColor = getProgressColor(percentage);
          const isUnlimited = metric.limit === -1;
          const remaining = isUnlimited ? Infinity : Math.max(0, metric.limit - metric.current);

          return (
            <div key={metric.label} className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                    {metric.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-brand-black">{metric.label}</h3>
                    <p className="text-xs text-gray-500 font-medium">{metric.period}</p>
                  </div>
                </div>
              </div>

              {/* Usage Numbers */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-black text-brand-black">{metric.current}</span>
                  <span className="text-lg text-gray-400 font-bold">/</span>
                  <span className="text-lg text-gray-600 font-black">
                    {isUnlimited ? '∞' : metric.limit}
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {isUnlimited ? (
                    'Unlimited usage'
                  ) : (
                    <>
                      <span className="font-black text-brand-black">{remaining}</span> remaining
                    </>
                  )}
                </p>
              </div>

              {/* Progress Bar */}
              {!isUnlimited && (
                <div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${progressColor} transition-all duration-500 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-gray-500">
                      {percentage.toFixed(0)}% used
                    </span>
                    {percentage >= 90 && (
                      <span className="text-xs font-black text-red-600">
                        ⚠️ Almost at limit
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isUnlimited && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Analysis Breakdown */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b-2 border-gray-200">
          <h3 className="text-lg font-black text-brand-black flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Analyses by Type
          </h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(currentUsage.analyses_by_type).map(([type, count]) => {
              const typeLabels: Record<string, { label: string; icon: string }> = {
                page_analysis: { label: 'Page Analysis', icon: '🌐' },
                ga4_analysis: { label: 'GA4 Analysis', icon: '📈' },
                survey_analysis: { label: 'Survey Analysis', icon: '📋' },
                review_mining: { label: 'Review Mining', icon: '⭐' },
                onsite_poll: { label: 'Onsite Poll', icon: '📊' },
                heatmap_analysis: { label: 'Heatmap Analysis', icon: '🗺️' },
                user_testing: { label: 'User Testing', icon: '👥' },
                other: { label: 'Other', icon: '📁' },
              };

              const typeInfo = typeLabels[type] || { label: type, icon: '📄' };

              return (
                <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeInfo.icon}</span>
                    <span className="text-sm font-bold text-gray-700">{typeInfo.label}</span>
                  </div>
                  <span className="text-base font-black text-brand-black">{count}</span>
                </div>
              );
            })}
          </div>

          {currentUsage.analyses_count === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-sm font-black text-gray-900 mb-1">No analyses yet</h4>
              <p className="text-sm text-gray-600">
                Start analyzing to see your usage breakdown
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Help Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-black text-blue-900 mb-1">Usage Resets Monthly</h4>
            <p className="text-sm text-blue-800 leading-relaxed mb-2">
              Your monthly limits (analyses and experiments) reset on the 1st of each month. Total limits (insights, themes, hypotheses) are cumulative.
            </p>
            <p className="text-xs text-blue-700">
              Need more? <Link href="/settings/billing" className="underline font-black hover:text-blue-900">Upgrade to Pro</Link> for 10x more analyses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsagePage() {
  return (
    <WorkspaceGuard>
      <UsageContent />
    </WorkspaceGuard>
  );
}
