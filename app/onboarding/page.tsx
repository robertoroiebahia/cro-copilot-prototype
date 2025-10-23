'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState<'welcome' | 'workspace' | 'complete'>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workspace form state
  const [workspaceName, setWorkspaceName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');

  // Check if user has already completed onboarding
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // If user already has workspaces, redirect to dashboard
      if (workspaces && workspaces.length > 0) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          user_id: user.id,
          name: workspaceName,
          website_url: websiteUrl || null,
          description: description || null,
          is_active: true,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Store workspace ID in localStorage
      if (workspace) {
        localStorage.setItem('selectedWorkspaceId', workspace.id);
      }

      // Mark onboarding as complete
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);

      setStep('complete');
    } catch (err) {
      console.error('Error creating workspace:', err);
      setError('Failed to create workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

      <div className="max-w-2xl w-full relative z-10">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center">
            {/* Logo */}
            <div className="inline-flex justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-brand-gold to-yellow-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-gold/30">
                <span className="text-4xl font-black text-white">G</span>
              </div>
            </div>

            {/* Welcome Message */}
            <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">
              Welcome to Galo CRO
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-xl mx-auto">
              Let's get you set up in less than 2 minutes. We'll create your first workspace and show you how to start optimizing conversions.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">AI-Powered Analysis</h3>
                <p className="text-sm text-gray-600">Analyze landing pages with GPT-4 and get actionable insights in minutes</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Smart Insights</h3>
                <p className="text-sm text-gray-600">Automatically extract insights, themes, and hypotheses from your data</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Fast Setup</h3>
                <p className="text-sm text-gray-600">Start analyzing in minutes, no complex setup or integrations required</p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => setStep('workspace')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold rounded-xl shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              Get Started
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}

        {/* Workspace Setup Step */}
        {step === 'workspace' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">Create Your First Workspace</h2>
              <p className="text-gray-600">A workspace helps you organize analyses for a specific website or project.</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateWorkspace} className="space-y-6">
              <div>
                <label htmlFor="workspace-name" className="block text-sm font-bold text-gray-900 mb-2">
                  Workspace Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="workspace-name"
                  type="text"
                  required
                  placeholder="My E-commerce Store"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition-all duration-200"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-2">Give your workspace a memorable name</p>
              </div>

              <div>
                <label htmlFor="website-url" className="block text-sm font-bold text-gray-900 mb-2">
                  Website URL
                </label>
                <input
                  id="website-url"
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition-all duration-200"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-2">The main website you'll be optimizing</p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-bold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="E.g., Main e-commerce site for fitness products..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition-all duration-200 resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-2">Optional: Add context about this workspace</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep('welcome')}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !workspaceName.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold rounded-xl shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    'Create Workspace'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="text-center">
            {/* Success Animation */}
            <div className="inline-flex justify-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-4xl font-black text-gray-900 mb-4">You're All Set!</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
              Your workspace has been created. Let's start optimizing your conversions!
            </p>

            {/* Quick Wins Checklist */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 text-left max-w-lg mx-auto">
              <h3 className="font-black text-gray-900 mb-6 text-center">Next Steps</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-brand-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-brand-gold">1</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Run your first analysis</p>
                    <p className="text-sm text-gray-600">Analyze a landing page to get AI-powered insights</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-gray-400">2</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-600">Review your insights</p>
                    <p className="text-sm text-gray-600">Explore extracted insights and themes</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-gray-400">3</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-600">Create hypotheses</p>
                    <p className="text-sm text-gray-600">Turn insights into testable hypotheses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold rounded-xl shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              Go to Dashboard
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
