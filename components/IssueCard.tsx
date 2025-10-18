import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * Severity levels for conversion issues
 */
export type IssueSeverity = 'critical' | 'medium' | 'low';

/**
 * Props for the IssueCard component
 */
export interface IssueCardProps {
  severity: IssueSeverity;
  section: string;
  currentScreenshot: string;
  issue: string;
  explanation: string;
  currentCopy?: string;
  suggestedCopy?: string;
  mockupScreenshot?: string;
  expectedImpact: string;
  confidence: string;
  effort: string;
  principle: string;
  analysisId?: string;
  onAddToQueue?: () => void;
  onSkip?: () => void;
}

/**
 * IssueCard - Displays a conversion issue with before/after comparison
 *
 * Shows a single CRO issue with visual screenshots, copy comparison,
 * and actionable metrics. Users can add to their optimization queue
 * or skip the suggestion.
 *
 * @example
 * ```tsx
 * <IssueCard
 *   severity="critical"
 *   section="Hero"
 *   currentScreenshot={heroBase64}
 *   issue="Headline is vague and doesn't communicate value"
 *   explanation="Visitors can't immediately understand what you offer..."
 *   currentCopy="Advanced Solutions"
 *   suggestedCopy="Save 10 Hours Per Week on Data Analysis"
 *   expectedImpact="15-22%"
 *   confidence="High"
 *   effort="Low"
 *   principle="Benefit over features"
 * />
 * ```
 */
export default function IssueCard({
  severity,
  section,
  currentScreenshot,
  issue,
  explanation,
  currentCopy,
  suggestedCopy,
  mockupScreenshot,
  expectedImpact,
  confidence,
  effort,
  principle,
  analysisId,
  onAddToQueue,
  onSkip,
}: IssueCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToQueue = async () => {
    if (onAddToQueue) {
      onAddToQueue();
      return;
    }

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
      title: issue,
      hypothesis: `By improving ${section.toLowerCase()}, we expect to see ${expectedImpact} lift`,
      type: 'issue',
      impact: severity === 'critical' ? 'High' : severity === 'medium' ? 'Medium' : 'Low',
      priority: severity === 'critical' ? 'P0' : severity === 'medium' ? 'P1' : 'P2',
      expected_lift: expectedImpact,
      confidence,
      effort,
      section,
      principle,
      current_state: currentCopy || `Current ${section.toLowerCase()} needs improvement`,
      proposed_change: suggestedCopy || `Improve ${section.toLowerCase()} based on ${principle}`,
      current_screenshot: currentScreenshot,
      mockup_screenshot: mockupScreenshot,
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

  // Color coding based on severity - Light theme
  const severityConfig = {
    critical: {
      badge: 'bg-red-500/20 text-red-700 border-red-500/30',
      border: 'border-l-brand-danger',
      icon: '🔴',
    },
    medium: {
      badge: 'bg-yellow-400/20 text-yellow-700 border-yellow-400/30',
      border: 'border-l-brand-gold',
      icon: '🟡',
    },
    low: {
      badge: 'bg-green-500/20 text-green-700 border-green-500/30',
      border: 'border-l-brand-success',
      icon: '🟢',
    },
  };

  const config = severityConfig[severity];

  // Confidence color coding - Light theme
  const confidenceColors = {
    High: 'bg-green-500/20 text-green-700 border-green-500/30',
    Medium: 'bg-yellow-400/20 text-yellow-700 border-yellow-400/30',
    Low: 'bg-gray-200 text-gray-700 border-gray-300',
  };

  // Effort color coding (reverse: low effort = success) - Light theme
  const effortColors = {
    Low: 'bg-green-500/20 text-green-700 border-green-500/30',
    Medium: 'bg-yellow-400/20 text-yellow-700 border-yellow-400/30',
    High: 'bg-red-500/20 text-red-700 border-red-500/30',
  };

  return (
    <div
      className={`bg-white rounded border-l-4 ${config.border} overflow-hidden transition-all hover:shadow-lg hover:border-brand-gold border border-gray-200`}
    >
      {/* Header with badges */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {/* Section badge */}
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {section}
          </span>

          {/* Severity badge */}
          <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded border ${config.badge}`}>
            <span>{config.icon}</span>
            {severity.charAt(0).toUpperCase() + severity.slice(1)} Priority
          </span>

          {/* Confidence badge */}
          <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded border ${confidenceColors[confidence as keyof typeof confidenceColors] || confidenceColors.Medium}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {confidence} Confidence
          </span>

          {/* Effort badge */}
          <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded border ${effortColors[effort as keyof typeof effortColors] || effortColors.Medium}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {effort} Effort
          </span>
        </div>

        {/* Issue title */}
        <h3 className="text-xl font-black text-black mt-2">
          {issue}
        </h3>

        {/* Principle tag */}
        <p className="text-sm text-gray-600 mt-1 italic">
          Principle: <span className="font-medium text-brand-gold">{principle}</span>
        </p>
      </div>

      {/* Explanation box */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-brand-gold mb-1">Why this matters</h4>
            <p className="text-sm text-black leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Before/After comparison */}
      <div className="px-6 py-6 bg-white">
        <div className="grid md:grid-cols-2 gap-6">
            {/* Current (Before) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">❌</span>
                <h4 className="text-base font-black text-black">Current</h4>
              </div>

              {/* Current screenshot */}
              <div className="relative rounded border border-red-500/30 overflow-hidden bg-gray-50">
                {!imageError ? (
                  <img
                    src={`data:image/png;base64,${currentScreenshot}`}
                    alt="Current version"
                    className="w-full h-auto"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center text-sm text-gray-600">
                    Screenshot unavailable
                  </div>
                )}
              </div>

              {/* Current copy */}
              {currentCopy && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Copy
                  </p>
                  <p className="text-sm text-black font-medium">
                    "{currentCopy}"
                  </p>
                </div>
              )}
            </div>

            {/* Suggested (After) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <h4 className="text-base font-black text-black">Suggested</h4>
              </div>

              {/* Suggested screenshot or mockup */}
              <div className="relative rounded border border-green-500/30 overflow-hidden bg-gray-50">
                {mockupScreenshot ? (
                  <img
                    src={`data:image/png;base64,${mockupScreenshot}`}
                    alt="Suggested version"
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-50">
                    <div className="text-center p-4">
                      <svg className="w-12 h-12 mx-auto text-brand-success mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-brand-success font-medium">
                        Mockup preview coming soon
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested copy */}
              {suggestedCopy && (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                    Improved Copy
                  </p>
                  <p className="text-sm text-black font-medium">
                    "{suggestedCopy}"
                  </p>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Impact metrics */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-sm font-black text-black">
            Expected Impact:
          </span>
          <span className="text-lg font-black text-brand-gold">
            {expectedImpact} lift
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAddToQueue}
            disabled={isAdding || added}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 font-black rounded transition-all duration-200 ${
              added
                ? 'bg-green-500/20 text-green-700 border border-green-500/30'
                : 'bg-black text-white hover:bg-brand-gold hover:text-brand-black'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isAdding ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Adding...
              </>
            ) : added ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Added to Queue!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add to Optimization Queue
              </>
            )}
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-black font-black rounded border-2 border-black hover:bg-brand-gold hover:border-brand-gold transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
