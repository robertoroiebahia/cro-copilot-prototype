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
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [ga4Configured, setGa4Configured] = useState(false);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentComparisonExpanded, setSegmentComparisonExpanded] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  // Calculate date range
  const getDateRange = (): { start: string; end: string } => {
    if (useCustomDates && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    const end = new Date().toISOString().split('T')[0]!;
    const start = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]!;
    return { start, end };
  };

  // Fetch available GA4 properties
  const fetchAvailableProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await fetch('/api/google-analytics/properties');
      const data = await res.json();
      if (data.success && data.properties) {
        setAvailableProperties(data.properties);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  // Handle property change
  const handlePropertyChange = async (propertyId: string) => {
    if (!selectedWorkspaceId || propertyId === currentPropertyId) return;

    try {
      const res = await fetch('/api/ga4/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          propertyId: propertyId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentPropertyId(propertyId);
        // Refresh data with new property
        await fetchFunnel();
        await fetchInsights();
      } else {
        setError(data.error || 'Failed to update property');
      }
    } catch (error) {
      console.error('Failed to change property:', error);
      setError('Failed to change property');
    }
  };

  // Check GA4 configuration and fetch properties
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    fetch(`/api/ga4/settings?workspaceId=${selectedWorkspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGa4Configured(data.settings?.isConfigured || false);
          setCurrentPropertyId(data.settings?.propertyId || null);
          // Fetch available properties for switching
          fetchAvailableProperties();
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
      const { start, end } = getDateRange();
      const res = await fetch(
        `/api/ga4/funnels?workspaceId=${selectedWorkspaceId}&startDate=${start}&endDate=${end}&segment=${selectedSegment}`
      );
      const data = await res.json();

      if (data.success && data.funnel) {
        // Transform funnel data to match component expectations
        const funnel = data.funnel;
        const transformedData = {
          steps: funnel.funnel_data?.steps || [],
          overall_cvr: funnel.overall_cvr || 0,
          total_landing_users: funnel.total_landing_users || 0,
          total_purchases: funnel.total_purchases || 0,
        };
        setFunnelData(transformedData);
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

  // Sync GA4 data (two-stage: quick funnel data, then AI insights)
  const handleSync = async () => {
    if (!selectedWorkspaceId) return;

    setSyncing(true);
    setError(null);
    setGeneratingInsights(false);
    setInsights([]); // Clear previous insights

    try {
      // Get selected date range
      const { start, end } = getDateRange();

      // Run sync with insights (will generate in background)
      setGeneratingInsights(true);
      const res = await fetch('/api/ga4/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          type: 'custom',
          startDate: start,
          endDate: end,
          generateInsights: true, // Generate insights immediately
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Show funnel data and insights when ready
        await fetchFunnel();
        await fetchInsights();
        setSyncing(false);
        setGeneratingInsights(false);
      } else {
        setError(data.error || 'Sync failed');
        setSyncing(false);
        setGeneratingInsights(false);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setError('Sync failed. Please try again.');
      setSyncing(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    if (ga4Configured && selectedWorkspaceId) {
      fetchFunnel();
      fetchInsights();
    }
  }, [selectedSegment, dateRange, customStartDate, customEndDate, useCustomDates, ga4Configured, selectedWorkspaceId]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h1 className="text-3xl font-black text-brand-black">GA4 Funnel Analysis</h1>
                {selectedWorkspace && (
                  <span className="px-3 py-1 bg-brand-gold/20 text-brand-gold text-xs font-bold rounded-lg">
                    {selectedWorkspace.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-text-secondary font-medium">
                Track conversion rates and identify optimization opportunities
              </p>
            </div>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-6 py-3 bg-brand-gold hover:bg-black text-brand-black hover:text-white font-black rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ boxShadow: syncing ? 'none' : '0 4px 12px rgba(245, 197, 66, 0.3)' }}
            >
              {syncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
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

          {/* Improved Filters Section */}
          <div className="space-y-4">
            {/* GA4 Property Selector */}
            {availableProperties.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  GA4 Property
                </label>
                <select
                  value={currentPropertyId || ''}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  disabled={loadingProperties}
                  className="w-full px-4 py-2 text-sm font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all bg-white disabled:opacity-50"
                >
                  {availableProperties.map((property) => (
                    <option key={property.name} value={property.name?.split('/')[1]}>
                      {property.displayName} ({property.name?.split('/')[1]})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range and Segment Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Date Range Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  Date Range
                </label>
                <div className="space-y-2">
                  <select
                    value={useCustomDates ? 'custom' : dateRange}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setUseCustomDates(true);
                        // Set default custom dates to last 30 days
                        const end = new Date().toISOString().split('T')[0]!;
                        const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
                        setCustomEndDate(end);
                        setCustomStartDate(start);
                      } else {
                        setUseCustomDates(false);
                        setDateRange(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2 text-sm font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all bg-white"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {/* Custom Date Inputs */}
                  {useCustomDates && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Segment Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  Segment
                </label>
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="w-full px-4 py-2 text-sm font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all bg-white"
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
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-8 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-gold border-t-transparent mx-auto mb-4"></div>
            <p className="text-brand-text-secondary font-medium">Loading funnel data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Funnel Visualization */}
            {funnelData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-black text-brand-black mb-4">Conversion Funnel</h2>
                <GA4FunnelChart data={funnelData} />
              </div>
            )}

            {/* Segment Comparison - Collapsible */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setSegmentComparisonExpanded(!segmentComparisonExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-xl font-black text-brand-black">Segment Comparison</h2>
                <svg
                  className={`w-5 h-5 text-brand-text-secondary transition-transform ${segmentComparisonExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {segmentComparisonExpanded && (
                <div className="px-6 pb-6 border-t border-gray-200">
                  <div className="mt-4">
                    <SegmentComparison dateRange={getDateRange()} />
                  </div>
                </div>
              )}
            </div>

            {/* AI Insights */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-brand-black">AI-Generated Insights</h2>
                {generatingInsights && (
                  <div className="flex items-center gap-2 text-brand-gold">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                    <span className="text-xs font-bold">Generating insights...</span>
                  </div>
                )}
              </div>
              {generatingInsights && insights.length === 0 ? (
                <div className="text-center py-12">
                  <div className="animate-pulse mb-4">
                    <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-brand-text-secondary font-medium mb-2">AI is analyzing your funnel data...</p>
                  <p className="text-brand-text-tertiary text-sm">This may take 30-60 seconds</p>
                </div>
              ) : insights.length > 0 ? (
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
          </div>
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
