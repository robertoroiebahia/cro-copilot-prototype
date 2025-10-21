'use client';

import { useState, useEffect } from 'react';
import { useWorkspace } from './WorkspaceContext';

export function SegmentComparison({ dateRange }: { dateRange: { start: string; end: string } }) {
  const { selectedWorkspaceId } = useWorkspace();
  const [funnels, setFunnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/ga4/funnels?workspaceId=${selectedWorkspaceId}&startDate=${dateRange.start}&endDate=${dateRange.end}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFunnels(data.funnels || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load funnels:', err);
        setLoading(false);
      });
  }, [dateRange, selectedWorkspaceId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-gold border-t-transparent mx-auto mb-2"></div>
        <p className="text-brand-text-tertiary text-sm">Loading segments...</p>
      </div>
    );
  }

  if (funnels.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-brand-text-secondary">No funnel data available for this date range.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left p-3 font-bold text-brand-black text-sm uppercase tracking-wide">Segment</th>
            <th className="text-right p-3 font-bold text-brand-black text-sm uppercase tracking-wide">Sessions</th>
            <th className="text-right p-3 font-bold text-brand-black text-sm uppercase tracking-wide">Purchases</th>
            <th className="text-right p-3 font-bold text-brand-black text-sm uppercase tracking-wide">CVR</th>
          </tr>
        </thead>
        <tbody>
          {funnels.map((funnel, index) => (
            <tr key={funnel.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="p-3 font-medium text-brand-black">{funnel.segment_label}</td>
              <td className="p-3 text-right text-brand-text-secondary">{funnel.total_landing_users?.toLocaleString() || '0'}</td>
              <td className="p-3 text-right text-brand-text-secondary">{funnel.total_purchases?.toLocaleString() || '0'}</td>
              <td className="p-3 text-right">
                <span className={`font-bold px-2 py-1 rounded ${
                  funnel.overall_cvr > 3
                    ? 'bg-green-100 text-green-700'
                    : funnel.overall_cvr > 1.5
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {funnel.overall_cvr || '0'}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
