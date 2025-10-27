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
    }
  }, [selectedWorkspaceId]);

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

      if (data.success) {
        alert(`Successfully synced ${data.result.ordersSynced} orders!`);
        fetchOrderStats();
      } else {
        alert(`Sync completed with errors: ${data.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync orders');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/dashboard" className="hover:text-blue-600">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/analyze" className="hover:text-blue-600">
              Analyze
            </Link>
            <span>/</span>
            <span className="text-gray-900">Shopify Order Analysis</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Shopify Order Analysis
              </h1>
              <p className="mt-2 text-gray-600">
                Analyze your Shopify orders to find AOV optimization opportunities
              </p>
            </div>

            <button
              onClick={() => setShowConnectModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Connect Store
            </button>
          </div>
        </div>

        {/* Connection Success Message */}
        {searchParams?.get('connected') === 'true' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">
                Shopify store connected successfully!
              </span>
            </div>
          </div>
        )}

        {/* Order Stats */}
        {orderStats && orderStats.orderCount > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Orders</h3>
              <p className="text-3xl font-bold text-gray-900">{orderStats.orderCount}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Analyses Run</h3>
              <p className="text-3xl font-bold text-gray-900">
                {orderStats.latestAnalysis ? '1+' : '0'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Connected Stores</h3>
              <p className="text-3xl font-bold text-gray-900">{connections.length}</p>
            </div>
          </div>
        )}

        {/* Connected Stores */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Connected Stores</h2>
          </div>

          <div className="p-6">
            {connections.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No stores connected
                </h3>
                <p className="mt-2 text-gray-600">
                  Connect your Shopify store to start analyzing your order data
                </p>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Connect Your First Store
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900">{connection.shop_name}</h3>
                        <p className="text-sm text-gray-600">{connection.shop_domain}</p>
                        {connection.last_sync_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          connection.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {connection.is_active ? 'Active' : 'Inactive'}
                      </span>

                      <button
                        onClick={() => handleSyncOrders(connection.id)}
                        disabled={syncing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {syncing ? 'Syncing...' : 'Sync Orders'}
                      </button>

                      <button
                        onClick={() => handleDisconnect(connection.id)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Section - Show when orders exist */}
        {orderStats && orderStats.orderCount > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Analysis</h2>
            <p className="text-gray-600 mb-6">
              Analyze your order data to discover:
            </p>
            <ul className="space-y-2 mb-6 text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Order value clustering (e.g., $0-$50, $50-$100 segments)
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Products frequently bought together
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Free shipping threshold opportunities
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                AOV optimization test ideas (prioritized by revenue impact)
              </li>
            </ul>
            <button
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              onClick={() => alert('Analysis engine coming soon!')}
            >
              Run AOV Analysis
            </button>
          </div>
        )}
      </div>

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
