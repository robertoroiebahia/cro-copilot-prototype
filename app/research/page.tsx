'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useWorkspace } from '@/components/WorkspaceContext';
import { useSubscription } from '@/lib/billing/useSubscription';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import ProBadge from '@/components/ProBadge';
import UpgradeModal from '@/components/UpgradeModal';
import UsageLimitBanner from '@/components/UsageLimitBanner';
import type { ResearchType } from '@/lib/types/insights.types';

interface ResearchMethodology {
  id: ResearchType;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  path: string;
  count: number;
  isPro?: boolean; // Premium feature flag
}

function ResearchContent() {
  const router = useRouter();
  const supabase = createClient();
  const { selectedWorkspaceId, selectedWorkspace } = useWorkspace();
  const { subscription, isPro, isFree, loading: subLoading } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [analysisStats, setAnalysisStats] = useState<Record<string, number>>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string>('');
  const [currentUsage, setCurrentUsage] = useState(0);

  const researchMethodologies: ResearchMethodology[] = [
    {
      id: 'page_analysis',
      name: 'Page Analysis',
      description: 'AI-powered analysis of landing pages, product pages, and checkout flows',
      icon: '🎨',
      color: 'blue',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-700',
      path: '/analyze',
      count: analysisStats['page_analysis'] || 0,
      isPro: false, // Free
    },
    {
      id: 'ga_analysis',
      name: 'Google Analytics',
      description: 'Funnel analysis, segment comparison, and behavioral insights from GA4',
      icon: '📊',
      color: 'orange',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-orange-700',
      path: '/analyze/ga',
      count: analysisStats['ga_analysis'] || 0,
      isPro: false, // Free
    },
    {
      id: 'heatmap_analysis',
      name: 'Heatmap Analysis',
      description: 'Click maps, scroll maps, and attention analysis from Hotjar/Clarity',
      icon: '🔥',
      color: 'red',
      gradientFrom: 'from-red-500',
      gradientTo: 'to-red-700',
      path: '/analyze/heatmap',
      count: analysisStats['heatmap_analysis'] || 0,
      isPro: true, // Pro only
    },
    {
      id: 'user_testing',
      name: 'User Testing',
      description: 'Session recordings, user interviews, and usability test insights',
      icon: '👥',
      color: 'purple',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-700',
      path: '/analyze/user-testing',
      count: analysisStats['user_testing'] || 0,
      isPro: true, // Pro only
    },
    {
      id: 'survey_analysis',
      name: 'Survey Analysis',
      description: 'Customer feedback, NPS, exit surveys, and qualitative research',
      icon: '📋',
      color: 'green',
      gradientFrom: 'from-green-500',
      gradientTo: 'to-green-700',
      path: '/analyze/survey',
      count: analysisStats['survey_analysis'] || 0,
      isPro: true, // Pro only
    },
    {
      id: 'review_mining',
      name: 'Review Mining',
      description: 'Extract insights from customer reviews and ratings',
      icon: '⭐',
      color: 'yellow',
      gradientFrom: 'from-yellow-500',
      gradientTo: 'to-yellow-700',
      path: '/analyze/review-mining',
      count: analysisStats['review_mining'] || 0,
      isPro: true, // Pro only
    },
  ];

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetchAnalysisStats();
    fetchCurrentUsage();
  }, [selectedWorkspaceId]);

  const fetchAnalysisStats = async () => {
    if (!selectedWorkspaceId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('research_type')
        .eq('workspace_id', selectedWorkspaceId);

      if (!error && data) {
        const stats = data.reduce((acc, analysis) => {
          const type = analysis.research_type || 'other';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setAnalysisStats(stats);
      }
    } catch (err) {
      console.error('Error fetching analysis stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUsage = async () => {
    if (!selectedWorkspaceId) return;

    try {
      const response = await fetch(`/api/usage?workspaceId=${selectedWorkspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentUsage(data.analyses_count || 0);
      }
    } catch (err) {
      console.error('Error fetching usage:', err);
    }
  };

  const handleMethodologyClick = (method: ResearchMethodology, e: React.MouseEvent) => {
    // If Pro feature and user is Free, show upgrade modal
    if (method.isPro && isFree) {
      e.preventDefault();
      setSelectedFeature(method.name);
      setShowUpgradeModal(true);
      return;
    }

    // Otherwise, navigate normally (Link handles it)
  };

  const totalAnalyses = Object.values(analysisStats).reduce((sum, count) => sum + count, 0);
  const methodologiesUsed = Object.keys(analysisStats).length;
  const analysesLimit = subscription?.limits.analyses_per_month || 5;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-b-4 border-brand-gold">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-2xl mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h1 className="text-5xl font-black mb-3">Research Hub</h1>
            {selectedWorkspace && (
              <p className="text-purple-200 text-lg font-medium mb-2">{selectedWorkspace.name}</p>
            )}
            <p className="text-white/90 text-lg max-w-2xl mx-auto">
              Choose your research methodology to uncover conversion opportunities
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-xl p-6 text-center">
              <div className="text-4xl font-black text-white mb-2">{totalAnalyses}</div>
              <div className="text-sm font-bold text-purple-100 uppercase tracking-wide">Total Analyses</div>
            </div>
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-xl p-6 text-center">
              <div className="text-4xl font-black text-white mb-2">{methodologiesUsed}</div>
              <div className="text-sm font-bold text-purple-100 uppercase tracking-wide">Methodologies Used</div>
            </div>
            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-xl p-6 text-center">
              <div className="text-4xl font-black text-white mb-2">6</div>
              <div className="text-sm font-bold text-purple-100 uppercase tracking-wide">Available Methods</div>
            </div>
          </div>
        </div>
      </div>

      {/* Research Methodologies Grid */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Usage Limit Banner */}
        {!subLoading && (
          <UsageLimitBanner
            resourceType="analyses"
            current={currentUsage}
            limit={analysesLimit}
            period="month"
          />
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-black text-brand-black mb-2">Choose Your Research Method</h2>
          <p className="text-brand-text-secondary">
            Each methodology provides unique insights to optimize your conversion rate
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-gold border-t-transparent mx-auto mb-4"></div>
            <p className="text-brand-text-secondary font-medium">Loading methodologies...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {researchMethodologies.map((method) => {
              const isLocked = method.isPro && isFree;

              return (
                <Link
                  key={method.id}
                  href={isLocked ? '#' : method.path}
                  onClick={(e) => handleMethodologyClick(method, e)}
                  className={`
                    group relative bg-white rounded-2xl border-2 border-gray-200 overflow-hidden transition-all duration-300
                    ${isLocked
                      ? 'cursor-pointer hover:border-brand-gold/50 hover:shadow-lg'
                      : 'hover:border-brand-gold hover:shadow-2xl hover:scale-105'
                    }
                  `}
                >
                  {/* Gradient Background on Hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${method.gradientFrom} ${method.gradientTo} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                  {/* Lock Overlay for Premium Features (Free Users) */}
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px] z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white rounded-full p-4 shadow-lg">
                        <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  <div className="relative p-8">
                    {/* Icon & Badge */}
                    <div className="flex items-start justify-between mb-6">
                      <div className={`text-6xl transform group-hover:scale-110 transition-transform duration-300 ${isLocked ? 'opacity-60' : ''}`}>
                        {method.icon}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {method.isPro && <ProBadge size="sm" tooltip />}
                        {method.count > 0 && (
                          <div className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/20 rounded-full">
                            <span className="text-xs font-black text-brand-gold">{method.count} analyses</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className={`text-2xl font-black mb-3 transition-colors ${
                      isLocked
                        ? 'text-gray-700 group-hover:text-brand-gold'
                        : 'text-brand-black group-hover:text-brand-gold'
                    }`}>
                      {method.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-brand-text-secondary leading-relaxed mb-6">
                      {method.description}
                    </p>

                    {/* CTA */}
                    <div className="flex items-center gap-2 text-brand-gold font-bold text-sm">
                      <span>{isLocked ? 'Unlock with Pro' : 'Start Analysis'}</span>
                      <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick Access to Other Pages */}
        <div className="mt-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-8">
          <h3 className="text-xl font-black text-brand-black mb-6 text-center">Quick Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/analyses"
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-gray-200 hover:border-brand-gold hover:shadow-lg transition-all duration-300 group"
            >
              <svg className="w-8 h-8 text-blue-600 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="text-sm font-bold text-brand-black">All Analyses</span>
            </Link>

            <Link
              href="/insights"
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-gray-200 hover:border-brand-gold hover:shadow-lg transition-all duration-300 group"
            >
              <svg className="w-8 h-8 text-purple-600 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-sm font-bold text-brand-black">Insights</span>
            </Link>

            <Link
              href="/themes"
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-gray-200 hover:border-brand-gold hover:shadow-lg transition-all duration-300 group"
            >
              <svg className="w-8 h-8 text-green-600 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span className="text-sm font-bold text-brand-black">Themes</span>
            </Link>

            <Link
              href="/experiments"
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-gray-200 hover:border-brand-gold hover:shadow-lg transition-all duration-300 group"
            >
              <svg className="w-8 h-8 text-orange-600 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-bold text-brand-black">Experiments</span>
            </Link>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={selectedFeature}
        limitType="feature"
      />
    </div>
  );
}

export default function ResearchPage() {
  return (
    <WorkspaceGuard>
      <ResearchContent />
    </WorkspaceGuard>
  );
}
