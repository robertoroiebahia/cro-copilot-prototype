'use client';

import { useMemo } from 'react';

interface FunnelChartProps {
  data: {
    landing: string;
    pdp: string;
    atc: string;
    checkout: string;
    purchase: string;
  };
  insights: any;
}

export function FunnelChart({ data, insights }: FunnelChartProps) {
  const stages = useMemo(() => {
    const values = [
      { name: 'Landing', value: Number(data.landing) },
      { name: 'PDP', value: Number(data.pdp) },
      { name: 'Add to Cart', value: Number(data.atc) },
      { name: 'Checkout', value: Number(data.checkout) },
      { name: 'Purchase', value: Number(data.purchase) },
    ];

    return values.map((stage, i) => {
      if (i === 0) return { ...stage, dropOff: 0, rate: 100, severity: 'good' };

      const prevStage = values[i - 1];
      if (!prevStage) return { ...stage, dropOff: 0, rate: 0, severity: 'critical' };
      const prev = prevStage.value;
      const dropOff = prev - stage.value;
      const rate = (stage.value / prev * 100).toFixed(1);

      return {
        ...stage,
        dropOff,
        rate: Number(rate),
        severity: Number(rate) < 30 ? 'critical' : Number(rate) < 50 ? 'high' : Number(rate) < 70 ? 'medium' : 'good'
      };
    });
  }, [data]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-[#F5C542]';
      default: return 'bg-green-500';
    }
  };

  const getBarColor = (index: number) => {
    // Alternate between brand-gold and brand-blue for visual variety
    return index % 2 === 0 ? 'bg-[#F5C542]' : 'bg-[#3E6DF4]';
  };

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={i} className="relative">
          <div className="flex items-center gap-3">
            <div
              className={`h-12 ${getBarColor(i)} relative transition-all duration-200`}
              style={{
                width: `${stages[0] ? (stage.value / stages[0].value) * 100 : 0}%`,
                borderRadius: '4px'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-between px-4 text-white text-sm font-bold">
                <span>{stage.name}</span>
                <span className="font-black">{stage.value.toLocaleString()}</span>
              </div>
            </div>
            {i > 0 && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getSeverityColor(stage.severity)}`} />
                <span className="text-xs text-white font-bold">{stage.rate}%</span>
              </div>
            )}
          </div>

          {i > 0 && stage.dropOff > 0 && (
            <div className="text-xs text-brand-text-secondary mt-1 ml-2">
              ↓ {stage.dropOff.toLocaleString()} users lost ({(100 - stage.rate).toFixed(1)}% drop-off)
            </div>
          )}
        </div>
      ))}
    </div>
  );
}