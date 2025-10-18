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
  // Normalize impact value to handle case variations
  const normalizedImpact = (recommendation.impact?.charAt(0).toUpperCase() + recommendation.impact?.slice(1).toLowerCase()) as 'High' | 'Medium' | 'Low';

  // Color schemes based on impact
  const impactColors = {
    High: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-800',
      icon: '🔴',
    },
    Medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: '🟡',
    },
    Low: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-800',
      icon: '🟢',
    },
  };

  // Type colors (also normalize)
  const normalizedType = (recommendation.type?.charAt(0).toUpperCase() + recommendation.type?.slice(1).toLowerCase()) as 'Iterative' | 'Substantial' | 'Disruptive';
  const typeColors = {
    Iterative: 'bg-blue-100 text-blue-800',
    Substantial: 'bg-purple-100 text-purple-800',
    Disruptive: 'bg-orange-100 text-orange-800',
  };

  // Effort colors (also normalize)
  const normalizedEffort = (recommendation.effort?.charAt(0).toUpperCase() + recommendation.effort?.slice(1).toLowerCase()) as 'Low' | 'Medium' | 'High';
  const effortColors = {
    Low: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    High: 'bg-red-100 text-red-700',
  };

  const colors = impactColors[normalizedImpact] || impactColors.Medium; // Fallback to Medium if undefined

  return (
    <div className={`${colors.bg} border-2 ${colors.border} rounded-lg p-6 hover:shadow-lg transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{colors.icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900">{recommendation.title}</h3>
              <span className="text-sm text-gray-500">#{index + 1}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Impact Badge */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                {normalizedImpact} Impact
              </span>
              {/* Type Badge */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[normalizedType] || 'bg-gray-100 text-gray-800'}`}>
                {normalizedType}
              </span>
              {/* Effort Badge */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${effortColors[normalizedEffort] || 'bg-gray-100 text-gray-800'}`}>
                {normalizedEffort} Effort
              </span>
              {/* Priority Badge */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {recommendation.priority}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{recommendation.expectedLift}</div>
          <div className="text-xs text-gray-600">Expected Lift</div>
        </div>
      </div>

      {/* Business Impact Tags */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Business Impact:
        </div>
        <div className="flex flex-wrap gap-2">
          {recommendation.businessImpact.map((impact) => (
            <span key={impact} className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-white border border-gray-300 text-gray-700">
              {impact}
            </span>
          ))}
        </div>
      </div>

      {/* Hypothesis */}
      <div className="mb-4 p-4 bg-white rounded-md border border-gray-200">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
          Hypothesis
        </div>
        <p className="text-sm text-gray-900 italic">"{recommendation.hypothesis}"</p>
      </div>

      {/* KPI */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
          KPI to Track
        </div>
        <p className="text-sm text-gray-900 font-medium">{recommendation.kpi}</p>
      </div>

      {/* Rationale */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
          What are we hoping to learn?
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{recommendation.rationale}</p>
      </div>

      {/* Current State vs Proposed Change */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Current State */}
        <div className="p-3 bg-white rounded-md border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">❌</span>
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Current State
            </div>
          </div>
          <p className="text-sm text-gray-700">{recommendation.currentState}</p>
        </div>

        {/* Proposed Change */}
        <div className="p-3 bg-white rounded-md border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✅</span>
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Proposed Change
            </div>
          </div>
          <p className="text-sm text-gray-700">{recommendation.proposedChange}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={handleAddToQueue}
          disabled={isAdding || added}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            added
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isAdding ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Adding...
            </>
          ) : added ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Added to Queue!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add to Test Queue
            </>
          )}
        </button>
      </div>
    </div>
  );
}
