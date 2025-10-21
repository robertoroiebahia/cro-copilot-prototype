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
    <div className="space-y-6">
      {/* Overall CVR */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <p className="text-sm font-bold text-gray-600 uppercase mb-2">
            Overall Conversion Rate
          </p>
          <p className="text-5xl font-black text-green-600">{overall_cvr}%</p>
          <p className="text-sm text-gray-500 mt-2">
            {total_purchases.toLocaleString()} purchases from {total_landing_users.toLocaleString()} sessions
          </p>
        </div>
      </div>

      {/* Funnel Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const width = (step.users / maxUsers) * 100;
          const isFirstStep = index === 0;

          // Color based on drop-off rate
          let colorClass = 'bg-green-500';
          if (step.drop_off_rate > 40) {
            colorClass = 'bg-red-500';
          } else if (step.drop_off_rate > 25) {
            colorClass = 'bg-orange-500';
          } else if (step.drop_off_rate > 15) {
            colorClass = 'bg-yellow-500';
          }

          return (
            <div key={step.event} className="space-y-2">
              {/* Step Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white font-bold text-sm">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-lg">{step.name}</h3>
                    <p className="text-xs text-gray-500">{step.event}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black">
                    {step.users.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {step.conversion_rate}% of total
                  </p>
                </div>
              </div>

              {/* Funnel Bar */}
              <div className="relative">
                <div
                  className={`h-16 ${colorClass} rounded-lg transition-all duration-500 flex items-center justify-between px-6`}
                  style={{ width: `${Math.max(width, 10)}%` }}
                >
                  <span className="text-white font-bold">
                    {step.conversion_rate}%
                  </span>
                  {!isFirstStep && (
                    <span className="text-white text-sm">
                      -{step.drop_off_rate}% from previous
                    </span>
                  )}
                </div>
              </div>

              {/* Drop-off indicator */}
              {!isFirstStep && step.drop_off > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 pl-12">
                  <svg
                    className="w-4 h-4 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                  <span>
                    <strong>{step.drop_off.toLocaleString()}</strong> users dropped off
                    ({step.drop_off_rate}%)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-bold mb-3">Drop-off Rate Legend:</p>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs">Excellent (&lt;15%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-xs">Good (15-25%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-xs">Fair (25-40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-xs">Poor (&gt;40%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
