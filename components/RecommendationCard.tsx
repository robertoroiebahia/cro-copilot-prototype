import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface Recommendation {
  id: string;
  title: string;
  hypothesis: string;
  impact: 'High' | 'Medium' | 'Low';
  type: 'Iterative' | 'Substantial' | 'Disruptive';
  businessImpact: Array<'Conversion' | 'Spend' | 'Frequency' | 'Merchandise'>;
  kpi: string;
  rationale: string;
  currentState: string;
  proposedChange: string;
  expectedLift: string;
  effort: 'Low' | 'Medium' | 'High';
  priority: 'P0' | 'P1' | 'P2';
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  index: number;
  analysisId?: string;
}

export default function RecommendationCard({ recommendation, index, analysisId }: RecommendationCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToQueue = async () => {
    if (!analysisId) {
      alert('Cannot add to queue: Analysis ID missing');
      return;
    }

    setIsAdding(true);
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      alert('Please log in to add tests to queue');
      setIsAdding(false);
      return;
    }

    const { error } = await supabase.from('test_queue').insert({
      user_id: user.id,
      analysis_id: analysisId,
      title: recommendation.title,
      hypothesis: recommendation.hypothesis,
      type: 'recommendation',
      impact: recommendation.impact,
      priority: recommendation.priority,
      expected_lift: recommendation.expectedLift,
      confidence: recommendation.kpi.includes('High') ? 'High' : recommendation.kpi.includes('Medium') ? 'Medium' : 'Low',
      effort: recommendation.effort,
      test_type: recommendation.type,
      business_impact: recommendation.businessImpact,
      kpi: recommendation.kpi,
      rationale: recommendation.rationale,
      current_state: recommendation.currentState,
      proposed_change: recommendation.proposedChange,
      status: 'queued',
    });

    if (error) {
      console.error('Failed to add to queue:', error);
      alert('Failed to add test to queue. Please try again.');
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    }

    setIsAdding(false);
  };

  // Priority colors
  const priorityConfig = {
    P0: {
      label: 'HIGH PRIORITY',
      color: '#10B981',
      bgGradient: 'from-green-50/50',
      borderColor: '#10B981',
    },
    P1: {
      label: 'MEDIUM PRIORITY',
      color: '#F5C542',
      bgGradient: 'from-yellow-50/50',
      borderColor: '#F5C542',
    },
    P2: {
      label: 'QUICK WIN',
      color: '#3E6DF4',
      bgGradient: 'from-blue-50/50',
      borderColor: '#3E6DF4',
    },
  };

  const config = priorityConfig[recommendation.priority] || priorityConfig.P1;

  // Category mapping - extract from title or use default
  const getCategory = () => {
    const title = recommendation.title.toLowerCase();
    if (title.includes('cta') || title.includes('button') || title.includes('call to action')) return 'CTA Optimization';
    if (title.includes('copy') || title.includes('headline') || title.includes('messaging')) return 'Copywriting';
    if (title.includes('social proof') || title.includes('trust') || title.includes('testimonial')) return 'Trust & Credibility';
    if (title.includes('form') || title.includes('checkout') || title.includes('friction')) return 'Form Optimization';
    if (title.includes('mobile') || title.includes('responsive')) return 'Mobile Experience';
    if (title.includes('hero') || title.includes('above fold')) return 'Hero Section';
    if (title.includes('value prop') || title.includes('benefit')) return 'Value Proposition';
    return 'Conversion Optimization';
  };

  // Implementation type - maps from effort + type
  const getImplementationType = () => {
    if (recommendation.effort === 'Low') return 'Copy + Design';
    if (recommendation.type === 'Iterative') return 'Design Change';
    if (recommendation.type === 'Substantial') return 'Dev + Design';
    return 'Code Change';
  };

  return (
    <div
      className={`group bg-gradient-to-r ${config.bgGradient} to-transparent border-l-4 rounded-r transition-all duration-300 ${
        isExpanded ? 'shadow-lg' : 'hover:shadow-md'
      }`}
      style={{
        borderLeftColor: config.borderColor,
        transform: isHovered && !isExpanded ? 'translateY(-1px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Collapsed Header - Always Visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Priority & Category Tags */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-black"
                style={{
                  backgroundColor: `${config.color}20`,
                  color: config.color,
                }}
              >
                {config.label}
              </span>
              <span className="text-xs font-bold text-brand-text-tertiary">
                {getCategory()}
              </span>
            </div>

            {/* Title */}
            <h4 className="font-black text-brand-black mb-1.5 group-hover:text-brand-gold transition-colors">
              {recommendation.title}
            </h4>

            {/* Hypothesis Preview - Only when collapsed */}
            {!isExpanded && (
              <p className="text-sm text-brand-text-secondary leading-relaxed line-clamp-2">
                {recommendation.hypothesis}
              </p>
            )}

            {/* Metrics Row - Only when collapsed */}
            {!isExpanded && (
              <div className="flex items-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-brand-text-secondary">
                  <svg
                    className="w-4 h-4"
                    style={{ color: config.color }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>{recommendation.expectedLift}</span>
                </div>
                <div className="flex items-center gap-1.5 text-brand-text-tertiary">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{getImplementationType()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Icon Indicator */}
          <div className="flex-shrink-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor: isExpanded ? config.color + '40' : config.color + '20',
              }}
            >
              <svg
                className={`w-5 h-5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                style={{ color: config.color }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fadeIn">
          {/* Full Hypothesis */}
          <div className="p-4 bg-white rounded border border-brand-gray-border">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div className="text-xs font-black text-brand-text-tertiary uppercase tracking-wide">Test Hypothesis</div>
            </div>
            <p className="text-sm text-brand-text-secondary leading-relaxed italic">
              "{recommendation.hypothesis}"
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded p-3 border border-brand-gray-border text-center">
              <div
                className="text-xl font-black mb-1"
                style={{ color: config.color }}
              >
                {recommendation.expectedLift}
              </div>
              <div className="text-xs text-brand-text-tertiary font-medium">Expected Lift</div>
            </div>
            <div className="bg-white rounded p-3 border border-brand-gray-border text-center">
              <div className="text-xl font-black text-brand-black mb-1 capitalize">
                {recommendation.impact}
              </div>
              <div className="text-xs text-brand-text-tertiary font-medium">Impact</div>
            </div>
            <div className="bg-white rounded p-3 border border-brand-gray-border text-center">
              <div className="text-xl font-black text-brand-black mb-1 capitalize">
                {recommendation.effort}
              </div>
              <div className="text-xs text-brand-text-tertiary font-medium">Effort</div>
            </div>
          </div>

          {/* Rationale / Why This Matters */}
          <div className="p-4 bg-white rounded border border-brand-gray-border">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs font-black text-brand-text-tertiary uppercase tracking-wide">Why This Matters</div>
            </div>
            <p className="text-sm text-brand-text-secondary leading-relaxed">
              {recommendation.rationale}
            </p>
          </div>

          {/* Current vs Proposed - Side by Side */}
          <div className="grid md:grid-cols-2 gap-3">
            {/* Current State */}
            <div className="p-4 bg-white rounded border-l-4 border-red-500">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div className="text-xs font-black text-red-700 uppercase tracking-wide">Current</div>
              </div>
              <p className="text-sm text-brand-text-secondary leading-relaxed">
                {recommendation.currentState}
              </p>
            </div>

            {/* Proposed Change */}
            <div className="p-4 bg-white rounded border-l-4 border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="text-xs font-black text-green-700 uppercase tracking-wide">Proposed</div>
              </div>
              <p className="text-sm text-brand-text-secondary leading-relaxed">
                {recommendation.proposedChange}
              </p>
            </div>
          </div>

          {/* KPI & Business Impact */}
          <div className="grid md:grid-cols-2 gap-3">
            {/* KPI */}
            <div className="p-4 bg-white rounded border border-brand-gray-border">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="text-xs font-black text-brand-text-tertiary uppercase tracking-wide">Primary KPI</div>
              </div>
              <p className="text-sm text-brand-black font-bold">{recommendation.kpi}</p>
            </div>

            {/* Business Impact */}
            <div className="p-4 bg-white rounded border border-brand-gray-border">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <div className="text-xs font-black text-brand-text-tertiary uppercase tracking-wide">Business Impact</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendation.businessImpact.map((impact) => (
                  <span
                    key={impact}
                    className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-brand-gold/20 text-brand-gold border border-brand-gold/30"
                  >
                    {impact}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddToQueue();
              }}
              disabled={isAdding || added}
              className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-black rounded transition-all duration-300 ${
                added
                  ? 'bg-green-500 text-white'
                  : 'bg-black text-white hover:bg-brand-gold hover:text-brand-black'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{
                boxShadow: !added && !isAdding && isHovered ? '0 8px 20px -4px rgba(212, 165, 116, 0.4)' : 'none',
              }}
            >
              {isAdding ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding to Queue...
                </>
              ) : added ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Added to Test Queue!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add to Test Queue
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
