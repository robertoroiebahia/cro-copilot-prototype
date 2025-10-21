'use client';

import { ResearchType, RESEARCH_TYPE_LABELS, RESEARCH_TYPE_ICONS } from '@/lib/types/insights.types';
import { useState } from 'react';

interface Analysis {
  id: string;
  url: string;
  research_type?: ResearchType;
  screenshots?: {
    full_page?: string;
    above_fold?: string;
    mobile?: string;
  };
  metadata?: Record<string, any>;
  context?: Record<string, any>;
  created_at: string;
}

interface AnalysisContextProps {
  analysis: Analysis;
  compact?: boolean;
}

/**
 * Research-Type-Aware Analysis Context Display
 *
 * Shows different content based on research type:
 * - Page Analysis: Screenshot + URL
 * - GA Analysis: Key metrics + charts (future)
 * - Heatmap Analysis: Heatmap visualization (future)
 * - Survey Analysis: Survey responses (future)
 */
export function AnalysisContext({ analysis, compact = false }: AnalysisContextProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const researchType = analysis.context?.research_type || analysis.research_type || 'page_analysis';

  const label = RESEARCH_TYPE_LABELS[researchType as ResearchType] || 'Unknown';
  const icon = RESEARCH_TYPE_ICONS[researchType as ResearchType] || '📝';

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:text-brand-gold transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold/10 rounded-lg flex items-center justify-center">
              <span className="text-xl">{icon}</span>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black text-brand-black">{label}</h3>
              <p className="text-xs text-brand-text-tertiary font-medium truncate max-w-md">
                {analysis.url}
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-brand-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {renderContent(analysis, researchType as ResearchType)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-gold/10 to-brand-gold/5 border-b border-gray-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-brand-black mb-1">{label}</h3>
            <a
              href={analysis.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium break-all"
            >
              {analysis.url}
            </a>
            <p className="text-xs text-brand-text-tertiary font-medium mt-1">
              Analyzed {new Date(analysis.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {renderContent(analysis, researchType as ResearchType)}
      </div>
    </div>
  );
}

/**
 * Render research-type-specific content
 */
function renderContent(analysis: Analysis, researchType: ResearchType) {
  switch (researchType) {
    case 'page_analysis':
      return <PageAnalysisContent analysis={analysis} />;

    case 'ga_analysis':
      return <GAAnalysisContent analysis={analysis} />;

    case 'heatmap_analysis':
      return <HeatmapAnalysisContent analysis={analysis} />;

    case 'survey_analysis':
      return <SurveyAnalysisContent analysis={analysis} />;

    default:
      return <DefaultContent analysis={analysis} />;
  }
}

/**
 * Page Analysis Content - Shows screenshot
 */
function PageAnalysisContent({ analysis }: { analysis: Analysis }) {
  const screenshot = analysis.screenshots?.full_page || analysis.screenshots?.above_fold;

  if (!screenshot) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-sm text-brand-text-secondary font-medium">
          No screenshot available for this analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-brand-text-secondary uppercase tracking-wide">
          Page Screenshot
        </h4>
        <a
          href={screenshot}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold"
        >
          View Full Size →
        </a>
      </div>
      <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
        <img
          src={screenshot}
          alt="Page screenshot"
          className="w-full h-auto"
          style={{ maxHeight: '600px', objectFit: 'contain' }}
        />
      </div>
      <p className="text-xs text-brand-text-tertiary font-medium italic">
        Visual analysis based on this screenshot and page content
      </p>
    </div>
  );
}

/**
 * GA Analysis Content - Shows data metrics (future)
 */
function GAAnalysisContent({ analysis }: { analysis: Analysis }) {
  // Future: Display GA charts, metrics, funnels, etc.
  return (
    <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
      <h4 className="text-sm font-black text-blue-900 mb-3">Google Analytics Data</h4>
      <p className="text-xs text-blue-800 mb-4">
        Analysis based on data from Google Analytics (Coming soon)
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-black text-brand-black mb-1">--</div>
          <div className="text-xs text-brand-text-secondary font-bold">Conversion Rate</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-black text-brand-black mb-1">--</div>
          <div className="text-xs text-brand-text-secondary font-bold">Bounce Rate</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-black text-brand-black mb-1">--</div>
          <div className="text-xs text-brand-text-secondary font-bold">Avg. Session</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-black text-brand-black mb-1">--</div>
          <div className="text-xs text-brand-text-secondary font-bold">Goal Value</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Heatmap Analysis Content - Shows heatmap (future)
 */
function HeatmapAnalysisContent({ analysis }: { analysis: Analysis }) {
  // Future: Display heatmap overlay, click maps, scroll maps
  return (
    <div className="bg-orange-50 rounded-lg border border-orange-200 p-6 text-center">
      <h4 className="text-sm font-black text-orange-900 mb-2">Heatmap Visualization</h4>
      <p className="text-xs text-orange-800">
        Heatmap and session recording analysis (Coming soon)
      </p>
    </div>
  );
}

/**
 * Survey Analysis Content - Shows survey results (future)
 */
function SurveyAnalysisContent({ analysis }: { analysis: Analysis }) {
  // Future: Display survey responses, sentiment analysis, word clouds
  return (
    <div className="bg-purple-50 rounded-lg border border-purple-200 p-6 text-center">
      <h4 className="text-sm font-black text-purple-900 mb-2">Survey Responses</h4>
      <p className="text-xs text-purple-800">
        Post-purchase survey and user feedback analysis (Coming soon)
      </p>
    </div>
  );
}

/**
 * Default Content - Generic display
 */
function DefaultContent({ analysis }: { analysis: Analysis }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
      <h4 className="text-sm font-black text-brand-black mb-3">Analysis Metadata</h4>
      <pre className="text-xs text-brand-text-secondary font-mono bg-white rounded p-4 overflow-auto max-h-64">
        {JSON.stringify(analysis.metadata || {}, null, 2)}
      </pre>
    </div>
  );
}
