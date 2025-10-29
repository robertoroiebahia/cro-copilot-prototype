'use client';

interface AOVOpportunity {
  opportunity_type: 'free_shipping' | 'bundle' | 'upsell' | 'cross_sell';
  title: string;
  description: string;
  potential_impact: string;
  priority: number;
  confidence_score: number;
  data_support: any;
}

interface AOVOpportunitiesListProps {
  opportunities: AOVOpportunity[];
}

const OPPORTUNITY_ICONS = {
  free_shipping: '🚚',
  bundle: '📦',
  upsell: '⬆️',
  cross_sell: '🔄',
};

const PRIORITY_COLORS = {
  1: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    text: 'HIGH PRIORITY',
  },
  2: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    text: 'MEDIUM PRIORITY',
  },
  3: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    text: 'LOW PRIORITY',
  },
};

export function AOVOpportunitiesList({ opportunities }: AOVOpportunitiesListProps) {
  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white border-2 border-gray-200 rounded-lg">
        <div className="mb-2 font-bold">No opportunities found</div>
        <div className="text-sm">
          We need more order data to generate optimization recommendations.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-2 border-gray-200 rounded-lg p-5 bg-white">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
          AOV Optimization Opportunities
        </div>
        <div className="text-base text-gray-600">
          {opportunities.length} prioritized test ideas to increase average order value
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {opportunities.map((opp, index) => {
          const priorityStyle = PRIORITY_COLORS[opp.priority as keyof typeof PRIORITY_COLORS] ||
            PRIORITY_COLORS[3];
          const icon = OPPORTUNITY_ICONS[opp.opportunity_type] || '💡';

          return (
            <div
              key={index}
              className={`${priorityStyle.bg} border-2 ${priorityStyle.border} rounded-lg p-5 transition-all duration-200 hover:shadow-md`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-bold ${priorityStyle.badge} rounded uppercase`}>
                        {priorityStyle.text}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        {(opp.confidence_score * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <h3 className="text-base font-black text-brand-black">
                      {opp.title}
                    </h3>
                  </div>
                </div>

                {/* Priority Number */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-gray-300">
                  <span className="text-xl font-black text-brand-black">
                    {opp.priority}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-3 pl-11">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {opp.description}
                </p>
              </div>

              {/* Impact */}
              <div className="pl-11 mb-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Potential Impact
                  </div>
                  <div className="text-sm font-bold text-brand-black">
                    {opp.potential_impact}
                  </div>
                </div>
              </div>

              {/* Data Support */}
              {opp.data_support && (
                <div className="pl-11">
                  <div className="bg-white/50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      Supporting Data
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(opp.data_support).map(([key, value]) => (
                        <div key={key}>
                          <div className="text-xs text-gray-500 capitalize mb-0.5">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm font-bold text-brand-black">
                            {typeof value === 'number'
                              ? value.toLocaleString()
                              : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pl-11 mt-4 flex gap-2">
                <button
                  className="px-3 py-1.5 text-xs font-bold bg-brand-black text-white rounded hover:bg-brand-gold hover:text-brand-black transition-colors"
                  onClick={() => {
                    // TODO: Implement "Create Experiment" flow
                    alert('Create experiment flow coming soon!');
                  }}
                >
                  Create Experiment
                </button>
                <button
                  className="px-3 py-1.5 text-xs font-bold bg-white text-brand-black border-2 border-gray-300 rounded hover:border-brand-gold transition-colors"
                  onClick={() => {
                    // TODO: Implement "Add to Backlog" flow
                    alert('Add to backlog flow coming soon!');
                  }}
                >
                  Add to Backlog
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="bg-brand-gold/10 border-2 border-brand-gold/30 rounded-lg p-4">
        <div className="text-xs font-bold text-brand-black mb-2">
          💡 How to prioritize:
        </div>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>
            <span className="font-bold">High Priority:</span> Strong data support and immediate revenue impact
          </li>
          <li>
            <span className="font-bold">Medium Priority:</span> Good opportunity but may need more setup
          </li>
          <li>
            <span className="font-bold">Low Priority:</span> Worth testing but lower expected impact
          </li>
        </ul>
      </div>
    </div>
  );
}
