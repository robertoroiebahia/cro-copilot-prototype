'use client';

import { useState } from 'react';

const TYPE_LABELS = {
  gap_analysis: 'Gap Analysis',
  segment_comparison: 'Segment Comparison',
  drop_off: 'Drop-off Point',
  anomaly: 'Anomaly',
  temporal_pattern: 'Temporal Pattern',
};

export function FunnelInsightsList({ insights }: { insights: any[] }) {
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No insights generated yet. Sync your data to generate insights.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="grid grid-cols-12 gap-4 text-xs font-black text-brand-text-tertiary uppercase tracking-wide">
          <div className="col-span-1">Impact</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-6">Observation</div>
          <div className="col-span-2">Segment</div>
          <div className="col-span-1">Confidence</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {insights.map((insight, index) => {
          const isExpanded = expandedInsight === index;

          const impactLookup: Record<string, { label: string; color: string }> = {
            critical: { label: 'CRIT', color: 'bg-red-500 text-white' },
            high: { label: 'HIGH', color: 'bg-orange-500 text-white' },
            medium: { label: 'MED', color: 'bg-blue-500 text-white' },
            low: { label: 'LOW', color: 'bg-gray-400 text-white' },
          };
          const impactConfig = impactLookup[insight.impact] || impactLookup.medium;

          const confidenceLookup: Record<string, { label: string; color: string }> = {
            high: { label: 'High', color: 'text-green-700' },
            medium: { label: 'Med', color: 'text-yellow-700' },
            low: { label: 'Low', color: 'text-red-700' },
          };
          const confidenceConfig = confidenceLookup[insight.confidence] || confidenceLookup.medium;

          return (
            <div key={insight.id || index} className="hover:bg-gray-50 transition-colors">
              {/* Main Row */}
              <button
                onClick={() => setExpandedInsight(isExpanded ? null : index)}
                className="w-full px-6 py-4 text-left"
              >
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Impact */}
                  <div className="col-span-1">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-black ${impactConfig.color}`}>
                      {impactConfig.label}
                    </span>
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    <span className="text-xs font-bold text-brand-text-secondary">
                      {TYPE_LABELS[insight.insight_type as keyof typeof TYPE_LABELS] || insight.insight_type}
                    </span>
                  </div>

                  {/* Observation */}
                  <div className="col-span-6">
                    <p className="text-sm font-medium text-brand-black line-clamp-2">
                      {insight.observation}
                    </p>
                  </div>

                  {/* Segment */}
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-brand-text-secondary">
                      {insight.primary_segment || 'All Users'}
                    </span>
                  </div>

                  {/* Confidence */}
                  <div className="col-span-1">
                    <span className={`text-xs font-bold ${confidenceConfig.color}`}>
                      {confidenceConfig.label}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-6 pb-4 bg-gray-50 border-t border-gray-200">
                  <div className="mt-4 space-y-4">
                    {/* Full Observation */}
                    <div>
                      <h4 className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Full Observation</h4>
                      <p className="text-sm text-brand-black font-medium">{insight.observation}</p>
                    </div>

                    {/* Data Points */}
                    {insight.data_points && Object.keys(insight.data_points).length > 0 && (
                      <div>
                        <h4 className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Data Points</h4>
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {Object.entries(insight.data_points).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-bold text-brand-text-secondary">{key}:</span>
                                <span className="font-medium text-brand-black">
                                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Segments Comparison */}
                    {(insight.primary_segment || insight.comparison_segment) && (
                      <div>
                        <h4 className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Segments</h4>
                        <div className="flex gap-4 text-xs">
                          {insight.primary_segment && (
                            <div>
                              <span className="font-bold text-brand-text-secondary">Primary:</span>
                              <span className="ml-2 font-medium text-brand-black">{insight.primary_segment}</span>
                            </div>
                          )}
                          {insight.comparison_segment && (
                            <div>
                              <span className="font-bold text-brand-text-secondary">vs.</span>
                              <span className="ml-2 font-medium text-brand-black">{insight.comparison_segment}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
