'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/components/WorkspaceContext';
import { useSubscription } from '@/lib/billing/useSubscription';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import QuickWinsChecklist from '@/components/QuickWinsChecklist';
import ProBadge from '@/components/ProBadge';
import UpgradeModal from '@/components/UpgradeModal';
import UsageLimitBanner from '@/components/UsageLimitBanner';
import { createClient } from '@/utils/supabase/client';
import type { ResearchType } from '@/lib/types/insights.types';

interface ResearchMethodology {
  id: ResearchType;
  name: string;
  description: string;
  icon: string;
  path: string;
  count: number;
  isPro?: boolean;
}

interface DashboardStats {
  totalAnalyses: number;
  totalInsights: number;
  totalThemes: number;
  totalHypotheses: number;
  totalExperiments: number;
  recentAnalyses: any[];
  recentInsights: any[];
}

function DashboardContent() {
  const router = useRouter();
  const supabase = createClient();
  const { selectedWorkspace, selectedWorkspaceId } = useWorkspace();
  const { subscription, isPro, isFree, loading: subLoading } = useSubscription();

  const [stats, setStats] = useState<DashboardStats | null>(null);
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
      path: '/analyze',
      count: analysisStats['page_analysis'] || 0,
      isPro: false,
    },
    {
      id: 'ga_analysis',
      name: 'Google Analytics',
      description: 'Funnel analysis, segment comparison, and behavioral insights from GA4',
      icon: '📊',
      path: '/analyze/ga',
      count: analysisStats['ga_analysis'] || 0,
      isPro: false,
    },
    {
      id: 'heatmap_analysis',
      name: 'Heatmap Analysis',
      description: 'Click maps, scroll maps, and attention analysis from Hotjar/Clarity',
      icon: '🔥',
      path: '/analyze/heatmap',
      count: analysisStats['heatmap_analysis'] || 0,
      isPro: true,
    },
    {
      id: 'user_testing',
      name: 'User Testing',
      description: 'Session recordings, user interviews, and usability test insights',
      icon: '👥',
      path: '/analyze/user-testing',
      count: analysisStats['user_testing'] || 0,
      isPro: true,
    },
    {
      id: 'survey_analysis',
      name: 'Survey Analysis',
      description: 'Customer feedback, NPS, exit surveys, and qualitative research',
      icon: '📋',
      path: '/analyze/survey',
      count: analysisStats['survey_analysis'] || 0,
      isPro: true,
    },
    {
      id: 'review_mining',
      name: 'Review Mining',
      description: 'Extract insights from customer reviews and ratings',
      icon: '⭐',
      path: '/analyze/review-mining',
      count: analysisStats['review_mining'] || 0,
      isPro: true,
    },
  ];

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetchDashboardData();
    fetchAnalysisStats();
    fetchCurrentUsage();
  }, [selectedWorkspaceId]);

  const fetchDashboardData = async () => {
    if (!selectedWorkspaceId) return;

    setLoading(true);
    try {
      const [
        analysesRes,
        insightsRes,
        themesRes,
        hypothesesRes,
        experimentsRes
      ] = await Promise.all([
        supabase
          .from('analyses')
          .select('id, url, research_type, created_at')
          .eq('workspace_id', selectedWorkspaceId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('insights')
          .select('id, statement, impact, created_at')
          .eq('workspace_id', selectedWorkspaceId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('themes')
          .select('id')
          .eq('workspace_id', selectedWorkspaceId),
        supabase
          .from('hypotheses')
          .select('id')
          .eq('workspace_id', selectedWorkspaceId),
        supabase
          .from('experiments')
          .select('id')
          .eq('workspace_id', selectedWorkspaceId),
      ]);

      setStats({
        totalAnalyses: analysesRes.data?.length || 0,
        totalInsights: insightsRes.data?.length || 0,
        totalThemes: themesRes.data?.length || 0,
        totalHypotheses: hypothesesRes.data?.length || 0,
        totalExperiments: experimentsRes.data?.length || 0,
        recentAnalyses: analysesRes.data || [],
        recentInsights: insightsRes.data || [],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysisStats = async () => {
    if (!selectedWorkspaceId) return;

    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('research_type')
        .eq('workspace_id', selectedWorkspaceId);

      if (!error && data) {
        const statsMap = data.reduce((acc, analysis) => {
          const type = analysis.research_type || 'other';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setAnalysisStats(statsMap);
      }
    } catch (err) {
      console.error('Error fetching analysis stats:', err);
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
    if (method.isPro && isFree) {
      e.preventDefault();
      setSelectedFeature(method.name);
      setShowUpgradeModal(true);
      return;
    }
  };

  const totalAnalyses = Object.values(analysisStats).reduce((sum, count) => sum + count, 0);
  const methodologiesUsed = Object.keys(analysisStats).length;
  const analysesLimit = subscription?.limits.analyses_per_month || 5;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-brand-gold border-t-transparent mx-auto mb-4"></div>
          <p className="text-brand-text-secondary font-medium text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-gold to-yellow-500 border-b-4 border-brand-gold shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 text-brand-black">
              {selectedWorkspace?.name || 'Dashboard'}
            </h1>
            <p className="text-brand-black/80 text-base sm:text-lg max-w-2xl mx-auto font-bold">
              Choose your research methodology to uncover conversion opportunities
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto mt-6 sm:mt-8">
            <div className="bg-white/20 backdrop-blur border border-brand-black/20 rounded-xl p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-4xl font-black text-brand-black mb-1 sm:mb-2">{totalAnalyses}</div>
              <div className="text-xs sm:text-sm font-bold text-brand-black/70 uppercase tracking-wide">Analyses</div>
            </div>
            <div className="bg-white/20 backdrop-blur border border-brand-black/20 rounded-xl p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-4xl font-black text-brand-black mb-1 sm:mb-2">{methodologiesUsed}</div>
              <div className="text-xs sm:text-sm font-bold text-brand-black/70 uppercase tracking-wide">Methods Used</div>
            </div>
            <div className="col-span-2 md:col-span-1 bg-white/20 backdrop-blur border border-brand-black/20 rounded-xl p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-4xl font-black text-brand-black mb-1 sm:mb-2">6</div>
              <div className="text-xs sm:text-sm font-bold text-brand-black/70 uppercase tracking-wide">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Usage Limit Banner */}
        {!subLoading && (
          <UsageLimitBanner
            resourceType="analyses"
            current={currentUsage}
            limit={analysesLimit}
            period="month"
          />
        )}

        {/* Research Methodologies */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-brand-black mb-2">Research Methods</h2>
          <p className="text-brand-text-secondary text-sm sm:text-base">
            Select a methodology to start analyzing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {researchMethodologies.map((method) => {
            const isLocked = method.isPro && isFree;

            return (
              <Link
                key={method.id}
                href={isLocked ? '#' : method.path}
                onClick={(e) => handleMethodologyClick(method, e)}
                className={`
                  group relative bg-white rounded-xl border-2 border-gray-200 overflow-hidden transition-all duration-200
                  ${isLocked
                    ? 'cursor-pointer hover:border-brand-gold/50 hover:shadow-md'
                    : 'hover:border-brand-gold hover:shadow-lg'
                  }
                `}
              >
                {isLocked && (
                  <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px] z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-white rounded-full p-3 shadow-lg">
                      <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                )}

                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`text-4xl transform transition-transform duration-200 ${isLocked ? 'opacity-60' : 'group-hover:scale-110'}`}>
                      {method.icon}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {method.isPro && <ProBadge size="sm" tooltip />}
                      {method.count > 0 && (
                        <div className="px-2 py-1 bg-brand-gold/10 border border-brand-gold/20 rounded-full">
                          <span className="text-xs font-black text-brand-gold">{method.count}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className={`text-lg font-black mb-2 transition-colors ${
                    isLocked
                      ? 'text-gray-700 group-hover:text-brand-gold'
                      : 'text-brand-black group-hover:text-brand-gold'
                  }`}>
                    {method.name}
                  </h3>

                  <p className="text-sm text-brand-text-secondary leading-relaxed mb-4">
                    {method.description}
                  </p>

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

        {/* Quick Wins Checklist */}
        <QuickWinsChecklist />

        {/* Quick Access */}
        <div className="mt-12 bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <h3 className="text-lg sm:text-xl font-black text-brand-black mb-4 sm:mb-6">Quick Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Link
              href="/analyses"
              className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 bg-gray-50 rounded-lg border border-gray-200 hover:border-brand-gold hover:shadow-md transition-all duration-200 group"
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="text-xs sm:text-sm font-bold text-brand-black">All Analyses</span>
            </Link>

            <Link
              href="/insights"
              className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 bg-gray-50 rounded-lg border border-gray-200 hover:border-brand-gold hover:shadow-md transition-all duration-200 group"
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-xs sm:text-sm font-bold text-brand-black">Insights</span>
            </Link>

            <Link
              href="/themes"
              className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 bg-gray-50 rounded-lg border border-gray-200 hover:border-brand-gold hover:shadow-md transition-all duration-200 group"
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span className="text-xs sm:text-sm font-bold text-brand-black">Themes</span>
            </Link>

            <Link
              href="/experiments"
              className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 bg-gray-50 rounded-lg border border-gray-200 hover:border-brand-gold hover:shadow-md transition-all duration-200 group"
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs sm:text-sm font-bold text-brand-black">Experiments</span>
            </Link>
          </div>
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

export default function DashboardPage() {
  return (
    <WorkspaceGuard>
      <DashboardContent />
    </WorkspaceGuard>
  );
}
