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
      
      const prev = values[i - 1].value;
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
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={i} className="relative">
          <div className="flex items-center gap-3">
            <div 
              className="h-12 bg-blue-600 rounded-r-lg relative transition-all"
              style={{ width: `${(stage.value / stages[0].value) * 100}%` }}
            >
              <div className="absolute inset-0 flex items-center justify-between px-4 text-white text-sm font-medium">
                <span>{stage.name}</span>
                <span>{stage.value.toLocaleString()}</span>
              </div>
            </div>
            {i > 0 && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getSeverityColor(stage.severity)}`} />
                <span className="text-xs text-gray-600">{stage.rate}%</span>
              </div>
            )}
          </div>
          
          {i > 0 && stage.dropOff > 0 && (
            <div className="text-xs text-gray-500 mt-1 ml-2">
              ↓ {stage.dropOff.toLocaleString()} users lost ({(100 - stage.rate).toFixed(1)}% drop-off)
            </div>
          )}
        </div>
      ))}
    </div>
  );
}