'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useWorkspace } from './WorkspaceContext';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    href: string;
  };
  icon: React.ReactNode;
}

export default function QuickWinsChecklist() {
  const { selectedWorkspaceId } = useWorkspace();
  const supabase = createClient();

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (selectedWorkspaceId) {
      loadChecklistProgress();
    }
  }, [selectedWorkspaceId]);

  const loadChecklistProgress = async () => {
    if (!selectedWorkspaceId) return;

    try {
      // Fetch all relevant data in parallel
      const [analysesRes, insightsRes, themesRes, hypothesesRes] = await Promise.all([
        supabase
          .from('analyses')
          .select('id')
          .eq('workspace_id', selectedWorkspaceId)
          .limit(1),
        supabase
          .from('insights')
          .select('id')
          .eq('workspace_id', selectedWorkspaceId)
          .limit(1),
        supabase
          .from('themes')
          .select('id')
          .eq('workspace_id', selectedWorkspaceId)
          .limit(1),
        supabase
          .from('hypotheses')
          .select('id')
          .eq('workspace_id', selectedWorkspaceId)
          .limit(1),
      ]);

      const hasAnalysis = (analysesRes.data?.length || 0) > 0;
      const hasInsights = (insightsRes.data?.length || 0) > 0;
      const hasThemes = (themesRes.data?.length || 0) > 0;
      const hasHypotheses = (hypothesesRes.data?.length || 0) > 0;

      const items: ChecklistItem[] = [
        {
          id: 'first-analysis',
          title: 'Run your first analysis',
          description: 'Analyze a landing page to get AI-powered insights',
          completed: hasAnalysis,
          action: !hasAnalysis ? {
            label: 'Start Analysis',
            href: '/analyze',
          } : undefined,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          id: 'review-insights',
          title: 'Review your insights',
          description: 'Explore the insights extracted from your analysis',
          completed: hasInsights,
          action: hasAnalysis && !hasInsights ? {
            label: 'View Insights',
            href: '/insights',
          } : undefined,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ),
        },
        {
          id: 'explore-themes',
          title: 'Explore themes',
          description: 'See how insights are grouped into strategic themes',
          completed: hasThemes,
          action: hasInsights && !hasThemes ? {
            label: 'View Themes',
            href: '/themes',
          } : undefined,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
            </svg>
          ),
        },
        {
          id: 'create-hypothesis',
          title: 'Create a hypothesis',
          description: 'Turn insights into testable experiment hypotheses',
          completed: hasHypotheses,
          action: hasThemes && !hasHypotheses ? {
            label: 'View Hypotheses',
            href: '/hypotheses',
          } : undefined,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          ),
        },
      ];

      setChecklist(items);

      // Auto-collapse if all items are completed
      const allCompleted = items.every(item => item.completed);
      if (allCompleted) {
        setIsExpanded(false);
      }
    } catch (error) {
      console.error('Error loading checklist progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercentage = (completedCount / totalCount) * 100;
  const allCompleted = completedCount === totalCount;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            allCompleted ? 'bg-green-100' : 'bg-brand-gold/10'
          }`}>
            {allCompleted ? (
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          </div>
          <div className="text-left">
            <h3 className="text-xl font-black text-gray-900">
              {allCompleted ? 'All Set! 🎉' : 'Quick Wins Checklist'}
            </h3>
            <p className="text-sm text-gray-600">
              {allCompleted
                ? 'You\'ve completed all getting started tasks'
                : `${completedCount} of ${totalCount} completed`
              }
            </p>
          </div>
        </div>

        <svg
          className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Progress Bar */}
      <div className="px-6 pb-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-gold to-yellow-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-3">
          {checklist.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                item.completed
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-brand-gold/30'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  item.completed
                    ? 'bg-green-600'
                    : 'border-2 border-gray-300'
                }`}>
                  {item.completed && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className={`font-bold mb-1 ${
                        item.completed ? 'text-green-900 line-through' : 'text-gray-900'
                      }`}>
                        {item.title}
                      </h4>
                      <p className={`text-sm ${
                        item.completed ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        {item.description}
                      </p>
                    </div>

                    {/* Action Button */}
                    {item.action && !item.completed && (
                      <Link
                        href={item.action.href}
                        className="flex-shrink-0 px-4 py-2 bg-brand-gold hover:bg-yellow-600 text-white font-bold rounded-lg text-sm transition-colors duration-200"
                      >
                        {item.action.label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Celebration Message */}
      {allCompleted && isExpanded && (
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-900 font-bold mb-2">🎉 Great job!</p>
            <p className="text-sm text-green-700">
              You've completed all the getting started tasks. Keep optimizing!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
