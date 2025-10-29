'use client';

interface OrderCluster {
  cluster_name: string;
  min_value: number;
  max_value: number;
  order_count: number;
  percentage: number;
  avg_order_value: number;
  total_revenue: number;
}

interface OrderClustersChartProps {
  clusters: OrderCluster[];
  currency?: string;
}

export function OrderClustersChart({ clusters, currency = 'USD' }: OrderClustersChartProps) {
  if (!clusters || clusters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No cluster data available
      </div>
    );
  }

  // Find max count for scaling
  const maxCount = Math.max(...clusters.map(c => c.order_count));

  // Calculate total orders for percentages
  const totalOrders = clusters.reduce((sum, c) => sum + c.order_count, 0);

  return (
    <div className="space-y-6">
      {/* Title and Summary */}
      <div className="border-2 border-gray-200 rounded-lg p-5 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Order Value Distribution
            </div>
            <div className="text-base text-gray-600">
              {totalOrders.toLocaleString()} orders analyzed across {clusters.length} value segments
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart - Horizontal */}
      <div className="space-y-3">
        {clusters.map((cluster) => {
          const barWidth = (cluster.order_count / maxCount) * 100;
          const isLargestSegment = cluster.order_count === maxCount;

          return (
            <div
              key={cluster.cluster_name}
              className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-brand-gold/50 transition-all duration-200"
            >
              {/* Cluster Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-brand-black">
                    {cluster.cluster_name}
                  </span>
                  {isLargestSegment && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-brand-gold/20 text-brand-gold rounded">
                      LARGEST
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-brand-black">
                    {cluster.order_count.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    orders
                  </div>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-gray-100 rounded-full h-8 mb-2 overflow-hidden">
                <div
                  className={`h-full ${
                    isLargestSegment
                      ? 'bg-gradient-to-r from-brand-gold to-brand-gold/80'
                      : 'bg-gradient-to-r from-blue-500 to-blue-400'
                  } flex items-center justify-end pr-3 transition-all duration-500`}
                  style={{ width: `${barWidth}%` }}
                >
                  <span className="text-xs font-bold text-white">
                    {cluster.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">
                    Avg Order Value
                  </div>
                  <div className="text-base font-black text-brand-black">
                    ${cluster.avg_order_value.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">
                    Total Revenue
                  </div>
                  <div className="text-base font-black text-brand-black">
                    ${cluster.total_revenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500 text-center font-medium">
        Order value ranges based on total_price (includes tax and shipping)
      </div>
    </div>
  );
}
