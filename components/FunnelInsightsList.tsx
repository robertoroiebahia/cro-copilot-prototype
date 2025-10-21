'use client';

const IMPACT_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const TYPE_LABELS = {
  gap_analysis: 'Gap Analysis',
  segment_comparison: 'Segment Comparison',
  drop_off: 'Drop-off Point',
  anomaly: 'Anomaly',
  temporal_pattern: 'Temporal Pattern',
};

export function FunnelInsightsList({ insights }: { insights: any[] }) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No insights generated yet. Sync your data to generate insights.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <div
          key={insight.id || index}
          className={`border rounded-lg p-4 ${IMPACT_COLORS[insight.impact as keyof typeof IMPACT_COLORS]}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-white bg-opacity-50">
                {TYPE_LABELS[insight.insight_type as keyof typeof TYPE_LABELS]}
              </span>
              <span className="text-xs font-bold uppercase">
                {insight.impact} Impact
              </span>
            </div>
            <span className="text-xs">
              Confidence: {insight.confidence}
            </span>
          </div>

          {/* Observation */}
          <p className="text-sm font-medium mb-3">{insight.observation}</p>

          {/* Data Points */}
          {insight.data_points && (
            <div className="bg-white bg-opacity-50 rounded p-3 text-xs space-y-1">
              {Object.entries(insight.data_points).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span>{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Segments */}
          {(insight.primary_segment || insight.comparison_segment) && (
            <div className="mt-3 text-xs">
              {insight.primary_segment && (
                <span className="mr-3">
                  <strong>Primary:</strong> {insight.primary_segment}
                </span>
              )}
              {insight.comparison_segment && (
                <span>
                  <strong>vs.</strong> {insight.comparison_segment}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
