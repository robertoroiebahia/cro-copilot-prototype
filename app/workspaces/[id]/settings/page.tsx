'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const supabase = createClient();

  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');

  // GA4 state
  const [ga4Properties, setGa4Properties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [loadingProperties, setLoadingProperties] = useState(false);

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  const fetchWorkspace = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load workspace');
      }

      const ws = data.workspace;
      setWorkspace(ws);
      setName(ws.name);
      setDescription(ws.description || '');
      setWebsiteUrl(ws.website_url || '');
      setTimezone(ws.timezone || 'UTC');
      setCurrency(ws.currency || 'USD');
      setSelectedPropertyId(ws.ga4_property_id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  const loadGA4Properties = async () => {
    setLoadingProperties(true);
    setError(null);

    try {
      const res = await fetch('/api/google-analytics/properties');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load GA4 properties');
      }

      setGa4Properties(data.properties || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GA4 properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          websiteUrl: websiteUrl || null,
          timezone,
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update workspace');
      }

      setSuccess('Workspace updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGA4 = async () => {
    if (!selectedPropertyId) {
      setError('Please select a GA4 property');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Get the current user's session to retrieve the refresh token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.provider_refresh_token) {
        throw new Error('Google Analytics access token not found. Please sign out and sign in with Google again.');
      }

      const res = await fetch(`/api/ga4/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          propertyId: selectedPropertyId,
          refreshToken: session.provider_refresh_token,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save GA4 configuration');
      }

      setSuccess('GA4 property configured successfully!');
      setTimeout(() => setSuccess(null), 3000);
      fetchWorkspace(); // Refresh workspace data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save GA4 configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete workspace');
      }

      router.push('/workspaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/workspaces" className="text-sm text-brand-gold hover:underline mb-2 inline-block">
            ← Back to Workspaces
          </Link>
          <h1 className="text-3xl font-black text-brand-black mb-2">Workspace Settings</h1>
          <p className="text-sm text-brand-text-secondary font-medium">
            Configure settings for {workspace?.name}
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        )}

        {/* Basic Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-black text-brand-black mb-4">Basic Information</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-brand-text-secondary mb-2">
                Workspace Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold"
                placeholder="My Workspace"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-text-secondary mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold"
                placeholder="Optional description..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-text-secondary mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold"
                placeholder="https://example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-brand-text-secondary mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold bg-white"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-text-secondary mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-brand-gold text-brand-black font-bold rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* GA4 Configuration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-black text-brand-black mb-2">Google Analytics 4</h2>
          <p className="text-sm text-brand-text-secondary mb-4">
            Connect a GA4 property to this workspace for funnel analysis
          </p>

          {workspace?.ga4_property_id ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-bold text-green-800">GA4 Connected</span>
              </div>
              <p className="text-sm text-green-700">Property ID: {workspace.ga4_property_id}</p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium">
                No GA4 property configured for this workspace
              </p>
            </div>
          )}

          {ga4Properties.length === 0 ? (
            <button
              onClick={loadGA4Properties}
              disabled={loadingProperties}
              className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              {loadingProperties ? 'Loading...' : 'Load GA4 Properties'}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-text-secondary mb-2">
                  Select GA4 Property
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold bg-white"
                >
                  <option value="">-- Select a property --</option>
                  {ga4Properties.map((prop) => (
                    <option key={prop.name} value={prop.name.split('/')[1]}>
                      {prop.displayName} ({prop.name.split('/')[1]})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSaveGA4}
                disabled={!selectedPropertyId || saving}
                className="px-6 py-2 bg-brand-gold text-brand-black font-bold rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Connect GA4 Property'}
              </button>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <h2 className="text-xl font-black text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-brand-text-secondary mb-4">
            Permanently delete this workspace and all associated settings
          </p>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Deleting...' : 'Delete Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}
