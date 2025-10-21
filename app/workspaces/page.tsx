'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWorkspace } from '@/components/WorkspaceContext';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  ga4_property_id: string | null;
  ga4_sync_enabled?: boolean;
  ga4_last_sync_at?: string | null;
  timezone?: string;
  currency?: string;
  is_active: boolean;
  created_at?: string;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const { workspaces, selectedWorkspaceId, selectWorkspace, refreshWorkspaces } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    websiteUrl: '',
    timezone: 'UTC',
    currency: 'USD',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      websiteUrl: '',
      timezone: 'UTC',
      currency: 'USD',
    });
    setEditingWorkspace(null);
    setShowCreateModal(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          websiteUrl: formData.websiteUrl || null,
          timezone: formData.timezone,
          currency: formData.currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create workspace');
      }

      await refreshWorkspaces();
      resetForm();
    } catch (error) {
      console.error('Create workspace error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace) return;

    setIsLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${editingWorkspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          websiteUrl: formData.websiteUrl || null,
          timezone: formData.timezone,
          currency: formData.currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update workspace');
      }

      await refreshWorkspaces();
      resetForm();
    } catch (error) {
      console.error('Update workspace error:', error);
      alert(error instanceof Error ? error.message : 'Failed to update workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (workspaceId: string) => {
    if (!confirm('Are you sure you want to delete this workspace? All associated data will remain but will not be accessible.')) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete workspace');
      }

      await refreshWorkspaces();

      // If deleted workspace was selected, select another one
      if (workspaceId === selectedWorkspaceId && workspaces.length > 1) {
        const nextWorkspace = workspaces.find(w => w.id !== workspaceId);
        if (nextWorkspace) {
          selectWorkspace(nextWorkspace.id);
        }
      }
    } catch (error) {
      console.error('Delete workspace error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (workspace: any) => {
    setFormData({
      name: workspace.name,
      description: workspace.description || '',
      websiteUrl: workspace.website_url || '',
      timezone: workspace.timezone,
      currency: workspace.currency,
    });
    setEditingWorkspace(workspace);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-brand-black">Workspaces</h1>
            <p className="text-brand-text-secondary mt-1">
              Manage your workspaces and GA4 properties
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-brand-gold text-brand-black font-bold rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Workspace
          </button>
        </div>

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className={`bg-white rounded-lg border-2 transition-all duration-200 ${
                workspace.id === selectedWorkspaceId
                  ? 'border-brand-gold shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-brand-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  {workspace.id === selectedWorkspaceId && (
                    <span className="px-2 py-1 bg-brand-gold text-brand-black text-xs font-bold rounded">
                      Active
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-brand-black mb-2">{workspace.name}</h3>

                {workspace.description && (
                  <p className="text-sm text-brand-text-secondary mb-3 line-clamp-2">
                    {workspace.description}
                  </p>
                )}

                {workspace.website_url && (
                  <p className="text-xs text-brand-text-tertiary mb-3 truncate">
                    {workspace.website_url}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {workspace.ga4_property_id ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">
                      GA4 Connected
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded uppercase">
                      No GA4
                    </span>
                  )}
                  {workspace.currency && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {workspace.currency}
                    </span>
                  )}
                  {workspace.timezone && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                      {workspace.timezone}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {workspace.id !== selectedWorkspaceId && (
                    <button
                      onClick={() => selectWorkspace(workspace.id)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-brand-black font-medium text-sm rounded hover:bg-gray-200 transition-colors"
                    >
                      Select
                    </button>
                  )}
                  <Link
                    href={`/workspaces/${workspace.id}/settings`}
                    className="flex-1 px-3 py-2 bg-brand-gold/10 text-brand-gold font-medium text-sm rounded hover:bg-brand-gold/20 transition-colors text-center"
                  >
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {workspaces.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-brand-black mb-2">No Workspaces</h3>
              <p className="text-brand-text-secondary mb-4">Create your first workspace to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-brand-gold text-brand-black font-bold rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Create Workspace
              </button>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {(showCreateModal || editingWorkspace) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-black text-brand-black mb-4">
                {editingWorkspace ? 'Edit Workspace' : 'Create Workspace'}
              </h2>

              <form onSubmit={editingWorkspace ? handleUpdate : handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-brand-black mb-2">
                      Workspace Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                      placeholder="My Company"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-brand-black mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                      placeholder="Optional description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-brand-black mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-brand-black mb-2">
                        Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern</option>
                        <option value="America/Chicago">Central</option>
                        <option value="America/Denver">Mountain</option>
                        <option value="America/Los_Angeles">Pacific</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-brand-black mb-2">
                        Currency
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-gray-100 text-brand-black font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-brand-gold text-brand-black font-bold rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : editingWorkspace ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
