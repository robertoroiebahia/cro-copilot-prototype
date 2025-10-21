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
  const { steps, overall_cvr, total_landing_users, total_purchases } = data;

  // Calculate max width for scaling
  const maxUsers = steps[0]?.users || 1;

  return (
    <div className="space-y-4">
      {/* Compact Funnel Steps - Horizontal Layout */}
      <div className="grid grid-cols-5 gap-2">
        {steps.map((step, index) => {
          const isFirstStep = index === 0;
          const isLastStep = index === steps.length - 1;

          // Color based on drop-off rate - using brand colors
          let barColor = 'bg-brand-gold';
          let textColor = 'text-brand-black';
          if (step.drop_off_rate > 40) {
            barColor = 'bg-red-500';
            textColor = 'text-white';
          } else if (step.drop_off_rate > 25) {
            barColor = 'bg-orange-500';
            textColor = 'text-white';
          }

          return (
            <div key={step.event} className="relative">
              {/* Compact Step Card */}
              <div className={`${barColor} rounded-lg p-3 h-full flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black text-white font-bold text-xs">
                      {index + 1}
                    </span>
                    <span className={`text-xs font-black ${textColor}`}>{step.name}</span>
                  </div>
                  <div className={`text-2xl font-black ${textColor} mb-1`}>
                    {step.users.toLocaleString()}
                  </div>
                  <div className={`text-xs font-bold ${textColor} opacity-80`}>
                    {step.conversion_rate}% reach
                  </div>
                </div>

                {/* Drop-off indicator at bottom */}
                {!isFirstStep && (
                  <div className={`text-xs font-bold ${textColor} opacity-90 mt-2 pt-2 border-t border-current border-opacity-20`}>
                    -{step.drop_off_rate}% drop
                  </div>
                )}
              </div>

              {/* Arrow between steps */}
              {!isLastStep && (
                <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 translate-x-1/2 z-10">
                  <svg className="w-4 h-4 text-brand-text-tertiary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Stats Bar - Compact */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-brand-text-secondary uppercase tracking-wide mb-1">
              Overall Conversion Rate
            </div>
            <div className="text-3xl font-black text-brand-black">{overall_cvr}%</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-brand-text-secondary">
              <span className="font-black text-brand-black">{total_purchases.toLocaleString()}</span> purchases
            </div>
            <div className="text-xs text-brand-text-tertiary">
              from {total_landing_users.toLocaleString()} sessions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
