'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Analysis } from '@/lib/types/database.types';
import { createClient } from '@/utils/supabase/client';
import RecommendationCard, { type Recommendation } from '@/components/RecommendationCard';
import HeuristicsDisplay from '@/components/HeuristicsDisplay';

type NavigationSection = 'overview' | 'recommendations';

// Navigation Button Component
function NavigationButton({ item, isActive, onClick }: {
  item: { id: NavigationSection; label: string; icon: React.ReactNode };
  isActive: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-full flex items-center gap-3 px-5 py-4 text-sm font-black rounded-lg transition-all duration-300 ${
        isActive
          ? 'bg-brand-gold text-black'
          : 'text-brand-text-secondary bg-white border border-gray-200'
      }`}
      style={{
        transform: isHovered && !isActive ? 'translateX(4px)' : 'translateX(0)',
        boxShadow: isActive
          ? '0 4px 12px rgba(245, 197, 66, 0.3), 0 2px 6px rgba(0, 0, 0, 0.1)'
          : isHovered
          ? '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)'
          : '0 2px 6px rgba(0, 0, 0, 0.04)',
        borderColor: isHovered && !isActive ? '#F5C542' : undefined,
      }}
    >
      <div className={`transition-colors duration-300 ${
        isActive ? 'text-black' : isHovered ? 'text-brand-gold' : 'text-brand-text-tertiary'
      }`}>
        {item.icon}
      </div>
      <span>{item.label}</span>
    </button>
  );
}

const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center pt-16">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
      <p className="text-base text-brand-text-secondary font-bold">Loading analysis details...</p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center pt-16">
    <div className="bg-white rounded-lg border border-red-200 p-10 max-w-lg text-center"
      style={{
        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.1)'
      }}
    >
      <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-brand-black mb-3">Something went wrong</h2>
      <p className="text-sm text-brand-text-secondary font-medium mb-6">{message}</p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
        style={{
          boxShadow: '0 4px 12px rgba(245, 197, 66, 0.3)'
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </Link>
    </div>
  </div>
);

export default function AnalysisDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NavigationSection>('overview');
  const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(null);

  const analysisId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!analysisId) {
        setError('Invalid analysis identifier.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace('/login');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (fetchError) {
        console.error('Failed to fetch analysis:', fetchError);
        setError('Unable to load this analysis. It may have been deleted or you may not have access to it.');
        setLoading(false);
        return;
      }

      if (!data || data.user_id !== user.id) {
        setError('Analysis not found or access denied.');
        setLoading(false);
        return;
      }

      setAnalysis(data as Analysis);
      setLoading(false);
    };

    loadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, supabase]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !analysis) {
    return <ErrorState message={error || 'Analysis not found.'} />;
  }

  const createdAt = new Date(analysis.created_at);
  const formattedDate = createdAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = createdAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const formatScreenshotSrc = (value?: string | null) => {
    if (!value) {
      return null;
    }
    return value.startsWith('data:image') ? value : `data:image/png;base64,${value}`;
  };

  const desktopFullPageSrc = formatScreenshotSrc(analysis.screenshots?.desktopFullPage);
  const mobileFullPageSrc = formatScreenshotSrc(analysis.screenshots?.mobileFullPage);

  const domain = (() => {
    try {
      return new URL(analysis.url).hostname.replace('www.', '');
    } catch {
      return analysis.url;
    }
  })();

  const navigationItems = [
    {
      id: 'overview' as NavigationSection,
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'recommendations' as NavigationSection,
      label: 'CRO Recommendations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white pt-16">{/* pt-16 accounts for fixed nav */}
      {/* Page Header - Premium Design */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6">
            <Link href="/dashboard" className="text-brand-text-tertiary hover:text-brand-gold transition-all duration-200 font-bold">
              Dashboard
            </Link>
            <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-brand-black font-black">Analysis Results</span>
          </nav>

          {/* Analysis Info - Clean Card */}
          <div className="bg-white rounded-lg border border-brand-gold p-6"
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1 min-w-0">
                {/* Domain & Status */}
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-black text-brand-black truncate">
                    {domain}
                  </h1>
                  <span
                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-black rounded ${
                      analysis.status === 'completed'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : analysis.status === 'processing'
                        ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                        : 'bg-red-100 text-red-700 border border-red-200'
                    }`}
                  >
                    {analysis.status === 'completed' ? '✓ COMPLETE' : analysis.status.toUpperCase()}
                  </span>
                </div>

                {/* URL Link */}
                <a
                  href={analysis.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand-text-secondary hover:text-brand-gold max-w-full truncate group font-bold transition-all duration-200"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="truncate">{analysis.url}</span>
                </a>
              </div>

              {/* Metadata Pills */}
              <div className="flex flex-wrap items-center gap-3">
                {/* LLM Badge */}
                {analysis.llm && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-sm font-black text-brand-black">
                      {analysis.llm === 'gpt' ? 'GPT-5' : 'Claude 4.5'}
                    </span>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-brand-text-secondary font-bold">
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs - Sticky */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-16 z-40"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="flex overflow-x-auto scrollbar-hide">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex-shrink-0 px-6 py-4 text-sm font-black whitespace-nowrap border-b-2 transition-all duration-200 ${
                activeSection === item.id
                  ? 'border-brand-gold text-brand-gold'
                  : 'border-transparent text-brand-text-tertiary hover:text-brand-gold'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar - Fixed position accounting for nav */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <nav className="sticky top-24 space-y-2">{/* top-24 = 16 (nav) + 8 (spacing) */}
              {navigationItems.map((item) => (
                <NavigationButton
                  key={item.id}
                  item={item}
                  isActive={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                />
              ))}
            </nav>
          </aside>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Summary Section - Premium Design */}
                {analysis.summary && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                    style={{
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    {/* Header with gradient accent */}
                    <div className="bg-gradient-to-r from-brand-gold/10 to-transparent border-b border-gray-200 px-8 py-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-brand-gold rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <h2 className="text-xl font-black text-brand-black">Analysis Summary</h2>
                      </div>

                      <p className="text-brand-black text-base leading-relaxed font-medium">
                        {analysis.summary.headline}
                      </p>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 divide-x divide-gray-200 bg-gray-50">
                      <div className="px-8 py-5">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="text-xs font-bold text-brand-text-tertiary uppercase tracking-wide">Tone</span>
                        </div>
                        <div className="text-lg font-black text-brand-black capitalize">{analysis.summary.diagnosticTone}</div>
                      </div>

                      <div className="px-8 py-5">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-bold text-brand-text-tertiary uppercase tracking-wide">Confidence</span>
                        </div>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg font-black text-sm ${
                          analysis.summary.confidence === 'high'
                            ? 'bg-green-100 text-green-700'
                            : analysis.summary.confidence === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {analysis.summary.confidence.charAt(0).toUpperCase() + analysis.summary.confidence.slice(1)}
                        </div>
                      </div>
                    </div>

                    {/* Context Section - Only show if user provided context */}
                    {analysis.context && (analysis.context.productType || analysis.context.pricePoint || analysis.context.trafficSource) && (
                      <div className="px-8 py-5 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-black text-brand-text-tertiary uppercase tracking-wide">Page Context</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {analysis.context.trafficSource && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/10 text-brand-gold rounded-lg text-xs font-black border border-brand-gold/20">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span>{analysis.context.trafficSource}</span>
                            </div>
                          )}
                          {analysis.context.productType && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/10 text-brand-gold rounded-lg text-xs font-black border border-brand-gold/20">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              <span>{analysis.context.productType}</span>
                            </div>
                          )}
                          {analysis.context.pricePoint && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/10 text-brand-gold rounded-lg text-xs font-black border border-brand-gold/20">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{analysis.context.pricePoint}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Heuristics Display */}
                {analysis.summary?.heuristics && (
                  <HeuristicsDisplay heuristics={analysis.summary.heuristics} />
                )}

                {/* Analysis Tokens */}
                {analysis.usage && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5"
                    style={{
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-bold text-brand-text-secondary">Analysis Tokens</span>
                      </div>
                      <span className="text-lg font-black text-brand-black">
                        {((analysis.usage.analysisInputTokens || 0) + (analysis.usage.analysisOutputTokens || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Full Page Screenshots - Collapsible */}
                {analysis.screenshots && (
                  <details className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                    style={{
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <summary className="px-6 py-5 cursor-pointer hover:bg-gray-50 transition-all duration-200 flex items-center gap-3 font-black text-brand-black group">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
                        <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span>Full Page Screenshots</span>
                      <svg className="w-5 h-5 ml-auto text-brand-text-tertiary group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-6 pb-6 pt-2 bg-gray-50">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <h4 className="text-sm font-black text-brand-text-secondary">Desktop - Full Page</h4>
                          </div>
                          {desktopFullPageSrc ? (
                            <img
                              src={desktopFullPageSrc}
                              alt="Desktop Full Page"
                              className="w-full border border-gray-200 rounded-lg hover:border-brand-gold transition-all duration-200 cursor-pointer bg-white"
                              style={{
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                              }}
                              onClick={() => setExpandedScreenshot(desktopFullPageSrc)}
                            />
                          ) : (
                            <div className="w-full h-48 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-brand-text-tertiary font-bold bg-white">
                              Desktop screenshot unavailable
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <h4 className="text-sm font-black text-brand-text-secondary">Mobile - Full Page</h4>
                          </div>
                          {mobileFullPageSrc ? (
                            <img
                              src={mobileFullPageSrc}
                              alt="Mobile Full Page"
                              className="w-full border border-gray-200 rounded-lg hover:border-brand-gold transition-all duration-200 cursor-pointer bg-white"
                              style={{
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                              }}
                              onClick={() => setExpandedScreenshot(mobileFullPageSrc)}
                            />
                          ) : (
                            <div className="w-full h-48 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-brand-text-tertiary font-bold bg-white">
                              Mobile screenshot unavailable
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {activeSection === 'recommendations' && (
              <div className="space-y-6">
                {analysis.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 ? (
                  <>
                    {/* Header with Stats - Premium Design */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                      style={{
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}
                    >
                      <div className="bg-gradient-to-r from-brand-gold/10 to-transparent border-b border-gray-200 px-8 py-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-brand-gold rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                              </div>
                              <h2 className="text-xl font-black text-brand-black">CRO Recommendations</h2>
                            </div>
                            <p className="text-sm text-brand-text-secondary font-medium">
                              Click any card to expand and view full details. Recommendations are sorted by priority and impact.
                            </p>
                          </div>

                          <div className="bg-brand-gold rounded-lg px-6 py-4 text-center"
                            style={{
                              boxShadow: '0 4px 12px rgba(245, 197, 66, 0.3)'
                            }}
                          >
                            <div className="text-4xl font-black text-black mb-1">{analysis.recommendations.length}</div>
                            <div className="text-xs text-black font-black uppercase tracking-wide">Tests Found</div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-3 divide-x divide-gray-200 bg-gray-50">
                        {['P0', 'P1', 'P2'].map((priority) => {
                          const count = (analysis.recommendations as unknown as Recommendation[]).filter(
                            (r: Recommendation) => r.priority === priority
                          ).length;

                          const priorityConfig = {
                            P0: { label: 'High Priority', color: 'text-green-600', icon: '🎯' },
                            P1: { label: 'Medium Priority', color: 'text-yellow-600', icon: '⚡' },
                            P2: { label: 'Quick Wins', color: 'text-blue-600', icon: '✨' },
                          };

                          const config = priorityConfig[priority as keyof typeof priorityConfig];

                          return (
                            <div key={priority} className="px-6 py-4 text-center">
                              <div className={`text-3xl font-black mb-1 ${config.color}`}>
                                {count}
                              </div>
                              <div className="text-xs text-brand-text-tertiary font-black uppercase tracking-wide">
                                {config.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grouped Recommendations */}
                    {['P0', 'P1', 'P2'].map((priority) => {
                      const recs = (analysis.recommendations as unknown as Recommendation[]).filter(
                        (r: Recommendation) => r.priority === priority
                      );

                      if (recs.length === 0) return null;

                      const priorityLabels = {
                        P0: { label: 'High Priority Tests', color: '#10B981', bgColor: 'bg-green-50' },
                        P1: { label: 'Medium Priority Tests', color: '#F5C542', bgColor: 'bg-yellow-50' },
                        P2: { label: 'Quick Win Tests', color: '#3E6DF4', bgColor: 'bg-blue-50' },
                      };

                      const config = priorityLabels[priority as keyof typeof priorityLabels];

                      return (
                        <div key={priority} className="space-y-3">
                          {/* Priority Section Header */}
                          <div className={`${config.bgColor} rounded-lg px-6 py-4 border-l-4`}
                            style={{ borderLeftColor: config.color }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: config.color + '20', color: config.color }}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-black text-brand-black">{config.label}</h3>
                              <span className="px-2.5 py-1 bg-white rounded-lg text-sm font-black text-brand-text-secondary border border-gray-200">
                                {recs.length} {recs.length === 1 ? 'test' : 'tests'}
                              </span>
                            </div>
                          </div>

                          {/* Cards */}
                          <div className="space-y-3">
                            {recs.map((rec: Recommendation, priorityIndex: number) => (
                              <RecommendationCard
                                key={rec.id || priorityIndex}
                                recommendation={rec}
                                index={priorityIndex}
                                analysisId={analysis.id}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-12 text-center"
                    style={{
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-brand-text-secondary font-bold">No recommendations available for this analysis.</p>
                  </div>
                )}
              </div>
            )}

          </main>
        </div>
      </div>

      {/* Screenshot Expansion Modal - Premium Design */}
      {expandedScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpandedScreenshot(null)}
        >
          <div className="relative max-w-6xl max-h-full overflow-auto">
            <button
              className="absolute -top-12 right-0 bg-brand-gold text-black rounded-lg px-4 py-2 font-black text-sm hover:bg-white transition-all duration-200 flex items-center gap-2"
              style={{
                boxShadow: '0 4px 12px rgba(245, 197, 66, 0.3)'
              }}
              onClick={() => setExpandedScreenshot(null)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
            <img
              src={expandedScreenshot}
              alt="Expanded Screenshot"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const formatScore = (value: number) => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1).replace(/\.0$/, '');
};

function renderAnalysisValue(value: any, key?: string): ReactElement {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">Not provided</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (typeof value === 'string') {
    if (key === 'priority' || key === 'status' || key === 'confidence') {
      const colorMap: Record<string, string> = {
        P0: 'bg-red-100 text-red-800 ring-1 ring-red-200',
        P1: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
        P2: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
        pass: 'bg-green-100 text-green-800 ring-1 ring-green-200',
        risk: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
        fail: 'bg-red-100 text-red-800 ring-1 ring-red-200',
        high: 'bg-red-100 text-red-800 ring-1 ring-red-200',
        medium: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
        low: 'bg-green-100 text-green-800 ring-1 ring-green-200',
        optimistic: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
        direct: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200',
        urgent: 'bg-red-100 text-red-800 ring-1 ring-red-200',
      };
      const colorClass = colorMap[value] || 'bg-gray-100 text-gray-800';
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
          {value}
        </span>
      );
    }

    if (value.length > 100) {
      return <p className="text-sm text-gray-700 leading-relaxed">{value}</p>;
    }

    return <span className="text-sm text-gray-800">{value}</span>;
  }

  if (typeof value === 'number') {
    const display = Number.isInteger(value) ? value.toLocaleString() : Number(value.toFixed(2)).toString();
    return <span className="text-sm font-semibold text-gray-900">{display}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic text-sm">None</span>;
    }

    const firstNonNull = value.find((item) => item !== null && item !== undefined);
    if (firstNonNull && typeof firstNonNull === 'object') {
      return (
        <div className="space-y-3 mt-2">
          {value.map((item, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
              {renderAnalysisValue(item)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <ul className="list-disc list-inside space-y-1 mt-2">
        {value.map((item, idx) => (
          <li key={idx} className="text-sm text-gray-700">
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="space-y-4 mt-2">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="border-l-2 border-blue-200 pl-4">
            <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              {k.replace(/([A-Z])/g, ' $1').trim()}
            </dt>
            <dd>{renderAnalysisValue(v, k)}</dd>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm text-gray-600">{String(value)}</span>;
}

function AnalysisContent({ data }: { data: any }) {
  if (data === null || data === undefined) {
    return (
      <div className="text-sm text-gray-500 italic">
        No data available for this section.
      </div>
    );
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return <div className="space-y-2">{renderAnalysisValue(data)}</div>;
  }

  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No data available for this section.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 border border-gray-200"
        >
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <div className="ml-3.5">{renderAnalysisValue(value, key)}</div>
        </div>
      ))}
    </div>
  );
}

function AboveFoldDetails({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <AnalysisContent data={data} />;
  }

  const { score, snapshot, wins, risks, priority, ...rest } = data;
  const winsList = Array.isArray(wins) ? wins : [];
  const risksList = Array.isArray(risks) ? risks : [];
  const restEntries = Object.keys(rest || {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {typeof score === 'number' && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
            <span>Hero Score</span>
            <span className="text-lg font-bold">{formatScore(score)}</span>
          </div>
        )}
        {priority && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Priority</span>
            {renderAnalysisValue(priority, 'priority')}
          </div>
        )}
      </div>

      {snapshot && (
        <p className="text-sm text-gray-700 leading-relaxed bg-white border border-blue-100 rounded-lg p-4 shadow-sm">
          {snapshot}
        </p>
      )}

      {winsList.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">
            What’s Working
          </h4>
          <ul className="space-y-2">
            {winsList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-800">
                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {risksList.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Immediate Risks</h4>
          {risksList.map((risk, idx) => {
            if (!risk || typeof risk !== 'object') {
              return (
                <div key={idx} className="bg-white border border-red-100 rounded-lg p-4">
                  {renderAnalysisValue(risk)}
                </div>
              );
            }

            const { issue, ...riskRest } = risk;
            return (
              <div key={idx} className="bg-white border border-red-100 rounded-lg p-4 shadow-sm space-y-3">
                {issue && <h5 className="text-sm font-semibold text-gray-900">{issue}</h5>}
                {Object.entries(riskRest).map(([riskKey, value]) => (
                  <div key={riskKey}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {riskKey.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    {renderAnalysisValue(value, riskKey)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {restEntries.length > 0 && <AnalysisContent data={rest} />}
    </div>
  );
}

function BelowFoldDetails({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <AnalysisContent data={data} />;
  }

  const { storyFlow, gaps, proofOpportunities, ctaPlacement, priority, ...rest } = data;
  const gapList = Array.isArray(gaps) ? gaps : [];
  const proofList = Array.isArray(proofOpportunities) ? proofOpportunities : [];
  const restEntries = Object.keys(rest || {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {priority && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Priority</span>
            {renderAnalysisValue(priority, 'priority')}
          </div>
        )}
      </div>

      {storyFlow && (
        <p className="text-sm text-gray-700 leading-relaxed bg-white border border-purple-100 rounded-lg p-4 shadow-sm">
          {storyFlow}
        </p>
      )}

      {gapList.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
            Gaps to Close
          </h4>
          {gapList.map((gap, idx) => {
            if (!gap || typeof gap !== 'object') {
              return (
                <div key={idx} className="bg-white border border-orange-100 rounded-lg p-4">
                  {renderAnalysisValue(gap)}
                </div>
              );
            }

            const { layer, ...gapRest } = gap;
            return (
              <div key={idx} className="bg-white border border-orange-100 rounded-lg p-4 shadow-sm space-y-3">
                {layer && <h5 className="text-sm font-semibold text-gray-900">{layer}</h5>}
                {Object.entries(gapRest).map(([gapKey, value]) => (
                  <div key={gapKey}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {gapKey.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    {renderAnalysisValue(value, gapKey)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {proofList.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">
            Proof Opportunities
          </h4>
          {renderAnalysisValue(proofList)}
        </div>
      )}

      {ctaPlacement && typeof ctaPlacement === 'object' && (
        <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">CTA Placement</h4>
          {Object.entries(ctaPlacement).map(([ctaKey, value]) => (
            <div key={ctaKey}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {ctaKey.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              {renderAnalysisValue(value, ctaKey)}
            </div>
          ))}
        </div>
      )}

      {restEntries.length > 0 && <AnalysisContent data={rest} />}
    </div>
  );
}

function FullPageDetails({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <AnalysisContent data={data} />;
  }

  const { conversionHealth, actionPlan, copyAngles, experienceRisks, ...rest } = data;
  const plan = actionPlan && typeof actionPlan === 'object' ? actionPlan : null;
  const restEntries = Object.keys(rest || {});

  const planConfig: Array<{
    key: 'fixThisWeek' | 'launchNext' | 'watchList';
    label: string;
    accent: string;
    description: string;
  }> = [
    {
      key: 'fixThisWeek',
      label: 'Fix This Week',
      accent: 'border-red-200 bg-red-50',
      description: 'High-impact fixes to ship immediately.',
    },
    {
      key: 'launchNext',
      label: 'Launch Next',
      accent: 'border-yellow-200 bg-yellow-50',
      description: 'Tests or initiatives to schedule next.',
    },
    {
      key: 'watchList',
      label: 'Watch List',
      accent: 'border-blue-200 bg-blue-50',
      description: 'Risks to monitor after changes go live.',
    },
  ];

  return (
    <div className="space-y-6">
      {conversionHealth && typeof conversionHealth === 'object' && (
        <div className="bg-white border border-green-100 rounded-lg p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 mb-3">
            {'score' in conversionHealth && typeof conversionHealth.score === 'number' && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                <span>Conversion Health</span>
                <span className="text-lg font-bold">{formatScore(conversionHealth.score)}</span>
              </div>
            )}
            {'confidence' in conversionHealth && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-gray-500">Confidence</span>
                {renderAnalysisValue(conversionHealth.confidence, 'confidence')}
              </div>
            )}
          </div>
          {'verdict' in conversionHealth && conversionHealth.verdict && (
            <p className="text-sm text-gray-700 leading-relaxed">{conversionHealth.verdict}</p>
          )}
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Action Plan</h4>
          <div className="grid md:grid-cols-3 gap-4">
            {planConfig.map(({ key, label, accent, description }) => {
              const items = Array.isArray(plan[key]) ? plan[key] : [];
              return (
                <div key={label} className={`rounded-lg border ${accent} p-4 space-y-3`}>
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900">{label}</h5>
                    <p className="text-xs text-gray-600 mt-1">{description}</p>
                  </div>
                  {items.length > 0 ? (
                    <div className="space-y-3">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white/80 border border-white rounded-lg p-3 space-y-2 shadow-sm">
                          {item?.title && (
                            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                          )}
                          {Object.entries(item || {})
                            .filter(([childKey]) => childKey !== 'title')
                            .map(([childKey, value]) => (
                              <div key={childKey}>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                  {childKey.replace(/([A-Z])/g, ' $1').trim()}
                                </p>
                                {renderAnalysisValue(value, childKey)}
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No items captured.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Array.isArray(copyAngles) && copyAngles.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Copy Angles to Test
          </h4>
          {renderAnalysisValue(copyAngles)}
        </div>
      )}

      {Array.isArray(experienceRisks) && experienceRisks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Experience Risks
          </h4>
          {renderAnalysisValue(experienceRisks)}
        </div>
      )}

      {restEntries.length > 0 && <AnalysisContent data={rest} />}
    </div>
  );
}

function StrategicExtensionsDetails({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <AnalysisContent data={data} />;
  }

  const { audienceSegments, acquisitionContinuity, creativeFeedbackLoop, handoffNotes, ...rest } = data;
  const restEntries = Object.keys(rest || {});

  return (
    <div className="space-y-6">
      {Array.isArray(audienceSegments) && audienceSegments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Audience Segments to Personalize
          </h4>
          {renderAnalysisValue(audienceSegments)}
        </div>
      )}

      {Array.isArray(acquisitionContinuity) && acquisitionContinuity.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Acquisition Continuity Ideas
          </h4>
          {renderAnalysisValue(acquisitionContinuity)}
        </div>
      )}

      {Array.isArray(creativeFeedbackLoop) && creativeFeedbackLoop.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Creative Feedback Loop
          </h4>
          {renderAnalysisValue(creativeFeedbackLoop)}
        </div>
      )}

      {handoffNotes && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
            Handoff Notes
          </h4>
          {renderAnalysisValue(handoffNotes)}
        </div>
      )}

      {restEntries.length > 0 && <AnalysisContent data={rest} />}
    </div>
  );
}
