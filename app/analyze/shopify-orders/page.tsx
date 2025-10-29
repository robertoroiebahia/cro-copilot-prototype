'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWorkspace } from '@/components/WorkspaceContext';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface ShopifyConnection {
  id: string;
  shop_domain: string;
  shop_name: string;
  currency: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

function ShopifyOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedWorkspaceId, selectedWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const supabase = createClient();

  const [connections, setConnections] = useState<ShopifyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [connectError, setConnectError] = useState('');

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');

  // Previous analyses
  const [previousAnalyses, setPreviousAnalyses] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Test connection state
  const [testing, setTesting] = useState(false);

  // Check for connection success
  useEffect(() => {
    if (searchParams?.get('connected') === 'true') {
      fetchConnections();
      fetchOrderStats();
    }
  }, [searchParams]);

  // Fetch connections on workspace change
  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchConnections();
      fetchOrderStats();
      fetchHistory();
    }
  }, [selectedWorkspaceId]);

  const fetchHistory = async () => {
    if (!selectedWorkspaceId) {
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);

    try {
      const { data, error: analysesError } = await supabase
        .from('analyses')
        .select('*')
        .eq('workspace_id', selectedWorkspaceId)
        .eq('research_type', 'shopify_order_analysis')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!analysesError && data) {
        // Fetch insights count for each analysis
        const analysesWithCounts = await Promise.all(
          data.map(async (analysis) => {
            const { count } = await supabase
              .from('insights')
              .select('*', { count: 'exact', head: true })
              .eq('analysis_id', analysis.id);

            return {
              ...analysis,
              insights_count: count || 0,
            };
          })
        );

        setPreviousAnalyses(analysesWithCounts);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }

    setHistoryLoading(false);
  };

  const fetchConnections = async () => {
    if (!selectedWorkspaceId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/shopify/connections?workspaceId=${selectedWorkspaceId}`);
      const data = await res.json();

      if (data.success) {
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderStats = async () => {
    if (!selectedWorkspaceId) return;

    try {
      const res = await fetch(`/api/shopify/sync?workspaceId=${selectedWorkspaceId}`);
      const data = await res.json();

      if (res.ok) {
        setOrderStats({
          orderCount: data.orderCount || 0,
          latestAnalysis: data.latestAnalysis,
        });
      }
    } catch (error) {
      console.error('Failed to fetch order stats:', error);
    }
  };

  const handleConnectShopify = () => {
    if (!shopDomain.trim()) {
      setConnectError('Please enter your shop domain');
      return;
    }

    // Clean up shop domain
    let cleanDomain = shopDomain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
    cleanDomain = cleanDomain.replace(/\/$/, '');

    // Redirect to OAuth flow
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(cleanDomain)}&workspaceId=${selectedWorkspaceId}`;
  };

  const handleSyncOrders = async (connectionId: string) => {
    if (!selectedWorkspaceId) return;

    setSyncing(true);
    try {
      const res = await fetch('/api/shopify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          connectionId,
          limit: 250,
        }),
      });

      const data = await res.json();

      // Handle 207 (partial success) and 200 (full success)
      if (res.status === 207 || res.status === 200) {
        const ordersSynced = data.result?.ordersSynced || data.partialResult?.ordersSynced || 0;
        const ordersFetched = data.result?.ordersFetched || data.partialResult?.ordersFetched || 0;

        if (res.status === 207) {
          // Partial success with errors
          const errorList = data.details && Array.isArray(data.details)
            ? data.details.slice(0, 3).join('\n')
            : data.error || 'Some orders failed to sync';

          const moreErrors = data.details && data.details.length > 3
            ? `\n...and ${data.details.length - 3} more errors`
            : '';

          alert(
            `Synced ${ordersSynced} of ${ordersFetched} orders.\n\n` +
            `Errors encountered:\n${errorList}${moreErrors}\n\n` +
            `Check console for full details.`
          );

          if (data.details) {
            console.error('Sync errors:', data.details);
          }
        } else {
          // Full success
          alert(`Successfully synced ${ordersSynced} orders!`);
        }

        fetchOrderStats();
      } else {
        // Complete failure
        alert(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync orders: Network or server error');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure? This will delete all synced orders from this store.')) {
      return;
    }

    try {
      const res = await fetch(`/api/shopify/connections?id=${connectionId}&workspaceId=${selectedWorkspaceId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchConnections();
        fetchOrderStats();
      } else {
        alert(`Failed to disconnect: ${data.error}`);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Failed to disconnect store');
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    if (!selectedWorkspaceId) return;

    setTesting(true);
    try {
      const res = await fetch(
        `/api/shopify/test-connection?connectionId=${connectionId}&workspaceId=${selectedWorkspaceId}`
      );
      const data = await res.json();

      if (data.success) {
        alert(
          `✅ Connection Test Passed!\n\n` +
          `Shop: ${data.connection.shop_name}\n` +
          `All API endpoints are accessible.\n\n` +
          data.recommendation
        );
      } else {
        const failedTests = Object.entries(data.tests || {})
          .filter(([_, test]: any) => !test.success)
          .map(([name, test]: any) => `  • ${name}: ${test.error || 'Failed'}`)
          .join('\n');

        alert(
          `❌ Connection Test Failed\n\n` +
          `Failed Tests:\n${failedTests}\n\n` +
          `${data.recommendation || 'Please reconnect your Shopify store.'}\n\n` +
          `Tip: Check console for full details.`
        );
        console.error('Connection test details:', data);
      }
    } catch (error) {
      console.error('Test connection error:', error);
      alert('Failed to test connection: Network or server error');
    } finally {
      setTesting(false);
    }
  };

  const handleRunAnalysis = async (connectionId: string) => {
    if (!selectedWorkspaceId) return;

    setAnalyzing(true);
    setAnalysisError('');

    try {
      const res = await fetch('/api/shopify/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          connectionId,
          minConfidence: 0.3,
        }),
      });

      const data = await res.json();

      console.log('[Shopify Analysis] Response:', data);

      if (data.success) {
        console.log('[Shopify Analysis] Analysis completed, redirecting to:', `/dashboard/results/${data.analysisId}`);

        // Refresh history
        fetchHistory();

        // Redirect to results page
        setTimeout(() => {
          router.push(`/dashboard/results/${data.analysisId}`);
        }, 1000);
      } else {
        console.error('[Shopify Analysis] Analysis failed:', data.error);
        setAnalysisError(data.error || 'Analysis failed');
        setAnalyzing(false);
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      setAnalysisError(error.message || 'Failed to run analysis');
      setAnalyzing(false);
    }
  };

  if (workspaceLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h1 className="heading-page">Shopify Order Analysis</h1>
          </div>
          <p className="text-body-secondary">
            AI-powered insights to increase average order value and revenue
          </p>
        </div>
      </div>

      {/* Main Content - Sidebar + Results */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Settings & Controls */}
          <div className="lg:col-span-1">
            <div
              className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24"
              style={{
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              <h2 className="text-lg font-black text-brand-black mb-6">Analysis Settings</h2>

              {/* Connection Success Message */}
              {searchParams?.get('connected') === 'true' && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-800 text-sm font-medium">
                      Store connected!
                    </span>
                  </div>
                </div>
              )}

              {/* Store Selector */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  Shopify Store
                </label>
                {connections.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">No stores connected</p>
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Connect Store
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedConnectionId}
                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                    className="w-full px-4 py-2 text-sm font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all bg-white disabled:opacity-50"
                    disabled={analyzing || syncing}
                  >
                    <option value="">Select a store...</option>
                    {connections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.shop_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Store Info */}
              {selectedConnectionId && connections.find(c => c.id === selectedConnectionId) && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Domain</div>
                  <div className="text-sm font-medium text-gray-900">
                    {connections.find(c => c.id === selectedConnectionId)?.shop_domain}
                  </div>
                  {connections.find(c => c.id === selectedConnectionId)?.last_sync_at && (
                    <>
                      <div className="text-xs text-gray-500 mt-2 mb-1">Last Synced</div>
                      <div className="text-sm text-gray-700">
                        {new Date(connections.find(c => c.id === selectedConnectionId)!.last_sync_at!).toLocaleString()}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              {orderStats && orderStats.orderCount > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs font-bold text-blue-900 mb-3">ORDER STATS</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-blue-700">Orders</div>
                      <div className="text-lg font-black text-blue-900">{orderStats.orderCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700">Stores</div>
                      <div className="text-lg font-black text-blue-900">{connections.length}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {selectedConnectionId && (
                  <>
                    <button
                      onClick={() => handleSyncOrders(selectedConnectionId)}
                      disabled={syncing || analyzing}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {syncing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Syncing Orders...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Sync Orders
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRunAnalysis(selectedConnectionId)}
                      disabled={!selectedConnectionId || analyzing || syncing}
                      className="w-full bg-black hover:bg-brand-gold disabled:bg-gray-200 disabled:cursor-not-allowed text-white hover:text-black font-black py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                      style={{
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      {analyzing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Running Analysis...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Run Analysis
                        </>
                      )}
                    </button>
                  </>
                )}

                {connections.length > 0 && (
                  <button
                    onClick={() => setShowConnectModal(true)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    + Add Another Store
                  </button>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs font-bold text-blue-900 mb-2">
                  📊 WHAT YOU'LL GET:
                </div>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>AI-powered insights to increase AOV</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Product bundling opportunities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Free shipping threshold recommendations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Prioritized test ideas to boost revenue</span>
                  </li>
                </ul>
              </div>
            </div>
            {/* End sticky sidebar */}
          </div>
          {/* End Left Sidebar */}

          {/* Right Side - Instructions & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error Display */}
            {analysisError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-900">{analysisError}</p>
                </div>
                <button
                  onClick={() => setAnalysisError('')}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Recent Analyses */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-black text-brand-black">Recent Analyses</h2>
              </div>

              {historyLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-gold border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500">Loading analyses...</p>
                </div>
              ) : previousAnalyses.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-black text-brand-black mb-2">No Analyses Yet</h3>
                  <p className="text-sm text-brand-text-secondary mb-4">
                    Run your first Shopify analysis to see results here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {previousAnalyses.map((analysis) => (
                    <Link
                      key={analysis.id}
                      href={`/dashboard/results/${analysis.id}`}
                      className="block p-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black px-2 py-1 bg-green-100 text-green-700 rounded uppercase">
                              SHOPIFY
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(analysis.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-brand-black group-hover:text-brand-gold transition-colors">
                            {analysis.name || 'Shopify Order Analysis'}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              {analysis.insights_count || 0} insights
                            </span>
                            {analysis.summary?.totalOrders && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                {analysis.summary.totalOrders.toLocaleString()} orders
                              </span>
                            )}
                            {analysis.summary?.averageOrderValue && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                ${analysis.summary.averageOrderValue.toFixed(2)} AOV
                              </span>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-gold transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* End Right Side */}
        </div>
        {/* End Grid */}
      </main>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Connect Shopify Store
              </h3>
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setConnectError('');
                  setShopDomain('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Enter your Shopify store domain to connect via OAuth
            </p>

            {connectError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {connectError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Domain
              </label>
              <input
                type="text"
                value={shopDomain}
                onChange={(e) => {
                  setShopDomain(e.target.value);
                  setConnectError('');
                }}
                placeholder="mystore.myshopify.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Example: mystore.myshopify.com
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setConnectError('');
                  setShopDomain('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectShopify}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Connect Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopifyOrdersPage() {
  return (
    <WorkspaceGuard>
      <ShopifyOrdersContent />
    </WorkspaceGuard>
  );
}
