'use client';

import { useWorkspace } from './WorkspaceContext';
import Link from 'next/link';
import { ReactNode } from 'react';

interface WorkspaceGuardProps {
  children: ReactNode;
  requireGA4?: boolean;
}

export default function WorkspaceGuard({ children, requireGA4 = false }: WorkspaceGuardProps) {
  const { selectedWorkspaceId, selectedWorkspace, isLoading } = useWorkspace();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-brand-gold border-t-transparent mx-auto mb-4"></div>
          <p className="text-brand-text-secondary font-medium text-lg">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // No workspace selected - First-time onboarding
  if (!selectedWorkspaceId || !selectedWorkspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-brand-gold to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <h1 className="text-4xl font-black text-brand-black mb-4">Welcome to Galo CRO</h1>
          <p className="text-xl text-brand-text-secondary mb-8">
            Let's get started by creating your first workspace
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-bold text-brand-black mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What is a workspace?
            </h3>
            <p className="text-brand-text-secondary text-sm leading-relaxed">
              A workspace represents a single client or website you're optimizing.
              If you manage multiple clients or properties, you can create separate workspaces for each one.
              All your analyses, insights, and experiments are organized by workspace.
            </p>
          </div>

          <Link
            href="/workspaces"
            className="inline-flex items-center gap-3 px-8 py-4 bg-brand-gold text-brand-black font-black text-lg rounded-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Your First Workspace
          </Link>
        </div>
      </div>
    );
  }

  // GA4 required but not configured
  if (requireGA4 && !selectedWorkspace.ga4_property_id) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>

            <h1 className="text-3xl font-black text-brand-black mb-3">Google Analytics Required</h1>
            <p className="text-brand-text-secondary mb-2 text-lg">
              This feature requires Google Analytics 4 integration for
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold/10 rounded-lg mb-6">
              <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-black text-brand-gold text-lg">{selectedWorkspace.name}</span>
            </div>

            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black font-bold rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configure Google Analytics
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // All good - render children
  return <>{children}</>;
}
