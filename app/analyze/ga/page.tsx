'use client';

import { useState, useEffect } from 'react';
import { useWorkspace } from '@/components/WorkspaceContext';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import { GA4FunnelChart } from '@/components/GA4FunnelChart';
import { SegmentComparison } from '@/components/SegmentComparison';
import { FunnelInsightsList } from '@/components/FunnelInsightsList';
import Link from 'next/link';

function GA4AnalysisContent() {
  const { selectedWorkspaceId, selectedWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [selectedSegment, setSelectedSegment] = useState('all_users');
  const [dateRange, setDateRange] = useState('30');
  const [ga4Configured, setGa4Configured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range
  const getDateRange = (days: string): { start: string; end: string } => {
    const end = new Date().toISOString().split('T')[0]!;
    const start = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]!;
    return { start, end };
  };

  // Check GA4 configuration
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    fetch(`/api/ga4/settings?workspaceId=${selectedWorkspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGa4Configured(data.settings?.isConfigured || false);
        } else {
          setError(data.error);
        }
      })
      .catch(err => {
        console.error('Failed to check GA4 configuration:', err);
        setError('Failed to load workspace settings');
      });
  }, [selectedWorkspaceId]);

  // Fetch funnel data
  const fetchFunnel = async () => {
    if (!selectedWorkspaceId) return;

    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange(dateRange);
      const res = await fetch(
        `/api/ga4/funnels?workspaceId=${selectedWorkspaceId}&startDate=${start}&endDate=${end}&segment=${selectedSegment}`
      );
      const data = await res.json();

      if (data.success) {
        setFunnelData(data.funnel);
      } else {
        // If funnel not found, it means no data has been synced yet
        if (data.error === 'Funnel not found') {
          setError('No funnel data available yet. Click "Sync Data" to fetch data from Google Analytics.');
        } else {
          setError(data.error || 'Failed to load funnel data');
        }
      }
    } catch (error) {
      console.error('Failed to fetch funnel:', error);
      setError('Failed to load funnel data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch insights
  const fetchInsights = async () => {
    if (!selectedWorkspaceId) return;

    try {
      const res = await fetch(`/api/ga4/insights?workspaceId=${selectedWorkspaceId}&limit=10`);
      const data = await res.json();

      if (data.success) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    }
  };

  // Sync GA4 data
  const handleSync = async () => {
    if (!selectedWorkspaceId) return;

    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/ga4/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          type: 'daily',
          generateInsights: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchFunnel();
        await fetchInsights();
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    if (ga4Configured && selectedWorkspaceId) {
      fetchFunnel();
      fetchInsights();
    }
  }, [selectedSegment, dateRange, ga4Configured, selectedWorkspaceId]);

  // GA4 not configured
  if (!ga4Configured) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-brand-black mb-3">Google Analytics 4 Not Connected</h1>
          <p className="text-brand-text-secondary mb-2">
            Connect your Google Analytics account to track funnel performance for
          </p>
          <p className="text-brand-gold font-bold mb-6">{selectedWorkspace?.name}</p>
          <Link
            href={selectedWorkspaceId ? `/workspaces/${selectedWorkspaceId}/settings` : '/workspaces'}
            className="inline-block px-6 py-3 bg-brand-gold text-brand-black font-bold rounded-lg hover:shadow-lg transition-all duration-200"
          >
            Configure GA4 for this Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-brand-black">GA4 Funnel Analysis</h1>
              {selectedWorkspace && (
                <span className="px-3 py-1 bg-brand-gold/20 text-brand-gold text-sm font-bold rounded-lg">
                  {selectedWorkspace.name}
                </span>
              )}
            </div>
            <p className="text-brand-text-secondary">
              Track conversion rates across your purchase funnel
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-6 py-3 bg-brand-gold text-brand-black font-bold rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-black border-t-transparent"></div>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Data
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-bold text-brand-black mb-4 uppercase tracking-wide">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>

            {/* Segment */}
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2">Segment</label>
              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              >
                <optgroup label="All">
                  <option value="all_users">All Users</option>
                </optgroup>
                <optgroup label="Device">
                  <option value="device_mobile">Mobile</option>
                  <option value="device_desktop">Desktop</option>
                  <option value="device_tablet">Tablet</option>
                </optgroup>
                <optgroup label="Channel">
                  <option value="channel_direct">Direct</option>
                  <option value="channel_email">Email</option>
                  <option value="channel_organic">Organic Search</option>
                  <option value="channel_paid">Paid</option>
                  <option value="channel_social">Social</option>
                </optgroup>
                <optgroup label="User Type">
                  <option value="user_new">New Users</option>
                  <option value="user_returning">Returning Users</option>
                </optgroup>
                <optgroup label="Geography">
                  <option value="country_us">United States</option>
                  <option value="country_non_us">International</option>
                </optgroup>
                <optgroup label="Landing Page">
                  <option value="landing_homepage">Homepage</option>
                  <option value="landing_product">Product Page</option>
                  <option value="landing_collection">Collection Page</option>
                  <option value="landing_blog">Blog</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-gold border-t-transparent mx-auto mb-4"></div>
            <p className="text-brand-text-secondary font-medium">Loading funnel data...</p>
          </div>
        ) : (
          <>
            {/* Funnel Visualization */}
            {funnelData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-black text-brand-black mb-4">Conversion Funnel</h2>
                <GA4FunnelChart data={funnelData} />
              </div>
            )}

            {/* Segment Comparison */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-black text-brand-black mb-4">Segment Comparison</h2>
              <SegmentComparison dateRange={getDateRange(dateRange)} />
            </div>

            {/* AI Insights */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-black text-brand-black mb-4">AI-Generated Insights</h2>
              {insights.length > 0 ? (
                <FunnelInsightsList insights={insights} />
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="text-brand-text-secondary text-sm">No insights available yet. Sync your data to generate insights.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GA4AnalysisPage() {
  return (
    <WorkspaceGuard requireGA4={false}>
      <GA4AnalysisContent />
    </WorkspaceGuard>
  );
}
