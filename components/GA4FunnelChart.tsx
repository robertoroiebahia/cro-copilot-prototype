'use client';

interface FunnelStep {
  name: string;
  event: string;
  users: number;
  conversion_rate: number;
  drop_off: number;
  drop_off_rate: number;
}

interface GA4FunnelChartProps {
  data: {
    steps: FunnelStep[];
    overall_cvr: number;
    total_landing_users: number;
    total_purchases: number;
  };
}

export function GA4FunnelChart({ data }: GA4FunnelChartProps) {
  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        No funnel data available
      </div>
    );
  }

  const { steps, overall_cvr, total_landing_users, total_purchases } = data;

  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No funnel steps available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats - Clean and Minimal */}
      <div className="border-2 border-gray-200 rounded-lg p-5 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Overall Conversion Rate
            </div>
            <div className="text-4xl font-black text-brand-gold">{overall_cvr || 0}%</div>
          </div>
          <div className="text-right">
            <div className="text-base text-brand-text-secondary mb-1">
              <span className="font-black text-brand-black text-2xl">{(total_purchases || 0).toLocaleString()}</span>
              <span className="ml-2 font-medium">conversions</span>
            </div>
            <div className="text-sm text-gray-500 font-medium">
              from {(total_landing_users || 0).toLocaleString()} landing sessions
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Steps - Clean Horizontal Flow */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-3">
          {steps.map((step, index) => {
            const isFirstStep = index === 0;
            const isLastStep = index === steps.length - 1;

            return (
              <div key={step.event} className="relative">
                {/* Step Card - Clean white with subtle accents */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 h-full flex flex-col justify-between transition-all duration-200 hover:border-brand-gold/50 hover:shadow-md">
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-gold text-brand-black font-black text-xs">
                        {index + 1}
                      </span>
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wide">
                        {step.name}
                      </span>
                    </div>

                    {/* Main Metric */}
                    <div className="text-3xl font-black text-brand-black mb-1 leading-none">
                      {step.users.toLocaleString()}
                    </div>

                    {/* Conversion Rate */}
                    <div className="text-xs font-bold text-gray-500">
                      {step.conversion_rate.toFixed(1)}% of total
                    </div>
                  </div>

                  {/* Drop-off Badge */}
                  {!isFirstStep && step.drop_off_rate > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-black text-red-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>{step.drop_off_rate.toFixed(1)}% drop</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {step.drop_off.toLocaleString()} users
                      </div>
                    </div>
                  )}
                </div>

                {/* Connection Arrow */}
                {!isLastStep && (
                  <div className="absolute top-1/2 -right-[18px] transform -translate-y-1/2 z-10">
                    <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
