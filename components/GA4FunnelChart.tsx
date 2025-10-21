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

  return (
    <div className="space-y-6">
      {/* Overall Stats - Top for Context */}
      <div className="bg-gradient-to-r from-brand-gold/10 to-brand-gold/5 rounded-lg border-2 border-brand-gold/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-1">
              Overall Conversion Rate
            </div>
            <div className="text-4xl font-black text-brand-black">{overall_cvr}%</div>
          </div>
          <div className="text-right">
            <div className="text-base text-brand-text-secondary mb-1">
              <span className="font-black text-brand-black text-2xl">{total_purchases.toLocaleString()}</span>
              <span className="ml-2 font-medium">purchases</span>
            </div>
            <div className="text-sm text-brand-text-tertiary font-medium">
              from {total_landing_users.toLocaleString()} landing sessions
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Steps - Horizontal Flow */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-3">
          {steps.map((step, index) => {
            const isFirstStep = index === 0;
            const isLastStep = index === steps.length - 1;
            const previousStep = index > 0 ? steps[index - 1] : null;

            // Dynamic color based on drop-off severity
            let barColor = 'bg-brand-gold';
            let textColor = 'text-brand-black';
            let borderColor = 'border-brand-gold/20';

            if (step.drop_off_rate > 40) {
              barColor = 'bg-red-500';
              textColor = 'text-white';
              borderColor = 'border-red-600';
            } else if (step.drop_off_rate > 25) {
              barColor = 'bg-orange-500';
              textColor = 'text-white';
              borderColor = 'border-orange-600';
            }

            return (
              <div key={step.event} className="relative">
                {/* Step Card */}
                <div className={`${barColor} rounded-xl p-4 shadow-sm border-2 ${borderColor} h-full flex flex-col justify-between transition-all duration-200 hover:shadow-md`}>
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-black text-white font-black text-xs">
                        {index + 1}
                      </span>
                      <span className={`text-sm font-black ${textColor} uppercase tracking-wide`}>
                        {step.name}
                      </span>
                    </div>

                    {/* Main Metric */}
                    <div className={`text-3xl font-black ${textColor} mb-2 leading-none`}>
                      {step.users.toLocaleString()}
                    </div>

                    {/* Conversion Rate */}
                    <div className={`text-sm font-bold ${textColor} opacity-90`}>
                      {step.conversion_rate.toFixed(1)}% of total
                    </div>
                  </div>

                  {/* Drop-off Badge */}
                  {!isFirstStep && step.drop_off_rate > 0 && (
                    <div className={`mt-3 pt-3 border-t-2 border-current border-opacity-20`}>
                      <div className={`text-xs font-black ${textColor} opacity-95 flex items-center gap-1`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>{step.drop_off_rate.toFixed(1)}% drop-off</span>
                      </div>
                      <div className={`text-xs ${textColor} opacity-75 mt-1`}>
                        Lost {step.drop_off.toLocaleString()} users
                      </div>
                    </div>
                  )}
                </div>

                {/* Connection Arrow with Drop-off */}
                {!isLastStep && previousStep && (
                  <div className="absolute top-1/2 -right-[18px] transform -translate-y-1/2 z-10 flex items-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
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
