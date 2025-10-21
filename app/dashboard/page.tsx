'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/components/WorkspaceContext';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import { createClient } from '@/utils/supabase/client';

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
  const { selectedWorkspace, selectedWorkspaceId } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!selectedWorkspaceId) return;

    fetchDashboardData();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-brand-gold border-t-transparent mx-auto mb-4"></div>
          <p className="text-brand-text-secondary font-medium text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Workspace Header */}
      <div className="bg-gradient-to-r from-brand-black to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-brand-gold rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400 font-medium">WORKSPACE</p>
                  <h1 className="text-4xl font-black">{selectedWorkspace?.name}</h1>
                </div>
              </div>
              {selectedWorkspace?.description && (
                <p className="text-gray-300 text-lg ml-15">{selectedWorkspace.description}</p>
              )}
              {selectedWorkspace?.website_url && (
                <a
                  href={selectedWorkspace.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold hover:text-yellow-400 text-sm ml-15 inline-flex items-center gap-1 mt-1"
                >
                  {selectedWorkspace.website_url}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
            <Link
              href="/workspaces"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all duration-200 border border-white/20"
            >
              Manage Workspaces
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="Analyses"
            value={stats?.totalAnalyses || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            href="/analyses"
            color="blue"
          />
          <StatCard
            title="Insights"
            value={stats?.totalInsights || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            href="/insights"
            color="purple"
          />
          <StatCard
            title="Themes"
            value={stats?.totalThemes || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
              </svg>
            }
            href="/themes"
            color="green"
          />
          <StatCard
            title="Hypotheses"
            value={stats?.totalHypotheses || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
            href="/hypotheses"
            color="orange"
          />
          <StatCard
            title="Experiments"
            value={stats?.totalExperiments || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            }
            href="/experiments"
            color="pink"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-black text-brand-black mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              title="New Analysis"
              description="Analyze a page with AI"
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
              href="/analyze"
              color="gold"
            />
            <ActionCard
              title="View Insights"
              description="Browse all insights"
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
              href="/insights"
              color="purple"
            />
            <ActionCard
              title="GA4 Funnels"
              description="View conversion data"
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              href="/analyze/ga"
              color="blue"
            />
          </div>
        </div>

        {/* Recent Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Analyses */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-brand-black">Recent Analyses</h3>
              <Link href="/analyses" className="text-brand-gold hover:text-yellow-600 font-bold text-sm">
                View All →
              </Link>
            </div>
            {stats?.recentAnalyses && stats.recentAnalyses.length > 0 ? (
              <div className="space-y-3">
                {stats.recentAnalyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    href={`/dashboard/${analysis.id}`}
                    className="block p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <p className="font-bold text-brand-black truncate">{analysis.url}</p>
                    <p className="text-sm text-brand-text-tertiary">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                message="No analyses yet"
                action={
                  <Link href="/analyze" className="text-brand-gold hover:text-yellow-600 font-bold text-sm">
                    Create your first analysis →
                  </Link>
                }
              />
            )}
          </div>

          {/* Recent Insights */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-brand-black">Recent Insights</h3>
              <Link href="/insights" className="text-brand-gold hover:text-yellow-600 font-bold text-sm">
                View All →
              </Link>
            </div>
            {stats?.recentInsights && stats.recentInsights.length > 0 ? (
              <div className="space-y-3">
                {stats.recentInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm text-brand-black line-clamp-2">{insight.statement}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                        insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {insight.impact}
                      </span>
                      <p className="text-xs text-brand-text-tertiary">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                }
                message="No insights yet"
                action={
                  <Link href="/analyze" className="text-brand-gold hover:text-yellow-600 font-bold text-sm">
                    Analyze a page to generate insights →
                  </Link>
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
type StatCardColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  href: string;
  color: StatCardColor;
}

function StatCard({ title, value, icon, href, color }: StatCardProps) {
  const colorClasses: Record<StatCardColor, string> = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    orange: 'bg-orange-100 text-orange-600 border-orange-200',
    pink: 'bg-pink-100 text-pink-600 border-pink-200',
  };

  return (
    <Link
      href={href}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105"
    >
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} border flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-3xl font-black text-brand-black mb-1">{value}</p>
      <p className="text-sm font-bold text-brand-text-secondary uppercase tracking-wide">{title}</p>
    </Link>
  );
}

type ActionCardColor = 'gold' | 'purple' | 'blue';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: ActionCardColor;
}

function ActionCard({ title, description, icon, href, color }: ActionCardProps) {
  const colorClasses: Record<ActionCardColor, string> = {
    gold: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
  };

  return (
    <Link
      href={href}
      className="p-6 rounded-xl border-2 border-gray-200 hover:border-brand-gold hover:shadow-lg transition-all duration-200"
    >
      <div className={`w-14 h-14 rounded-xl ${colorClasses[color]} border flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-black text-brand-black text-lg mb-1">{title}</h3>
      <p className="text-sm text-brand-text-secondary">{description}</p>
    </Link>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}

function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
        {icon}
      </div>
      <p className="text-brand-text-secondary mb-2">{message}</p>
      {action}
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
