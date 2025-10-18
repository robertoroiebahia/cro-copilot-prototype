interface HeuristicsDisplayProps {
  heuristics: {
    clarity: number;
    trust: number;
    urgency: number;
    friction: number;
  };
}

export default function HeuristicsDisplay({ heuristics }: HeuristicsDisplayProps) {
  const metrics = [
    {
      name: 'Clarity',
      value: heuristics.clarity,
      max: 2,
      description: 'Headline & subheadline presence',
      icon: '📝',
      color: heuristics.clarity >= 2 ? 'green' : heuristics.clarity === 1 ? 'yellow' : 'red',
    },
    {
      name: 'Trust',
      value: heuristics.trust,
      max: 2,
      description: 'Trust badges & reviews',
      icon: '🛡️',
      color: heuristics.trust >= 2 ? 'green' : heuristics.trust === 1 ? 'yellow' : 'red',
    },
    {
      name: 'Urgency',
      value: heuristics.urgency,
      max: 1,
      description: 'Urgency messaging present',
      icon: '⚡',
      color: heuristics.urgency === 1 ? 'green' : 'red',
    },
    {
      name: 'Friction',
      value: heuristics.friction,
      max: 1,
      description: 'Form complexity (lower is better)',
      icon: '🚧',
      color: heuristics.friction === 0 ? 'green' : 'red',
      inverted: true, // For friction, lower is better
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'yellow':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'red':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getBarColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Page Health Metrics</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Heuristic Analysis
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Quantitative scores based on detected page elements and structure.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const percentage = (metric.value / metric.max) * 100;
          const displayPercentage = metric.inverted ? 100 - percentage : percentage;

          return (
            <div
              key={metric.name}
              className={`border-2 rounded-lg p-4 ${getColorClasses(metric.color)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{metric.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{metric.name}</h3>
                    <p className="text-xs opacity-75">{metric.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {metric.inverted ? metric.max - metric.value : metric.value}/{metric.max}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/50 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full transition-all ${getBarColorClasses(metric.color)}`}
                  style={{ width: `${displayPercentage}%` }}
                />
              </div>

              {/* Status text */}
              <div className="mt-2 text-xs font-medium">
                {metric.color === 'green' && (
                  <span>✓ {metric.inverted ? 'Low friction' : 'Good'}</span>
                )}
                {metric.color === 'yellow' && (
                  <span>⚠ Needs improvement</span>
                )}
                {metric.color === 'red' && (
                  <span>✗ {metric.inverted ? 'High friction' : 'Missing'}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 text-lg">💡</span>
          <div className="text-sm text-blue-900">
            <strong>How to interpret:</strong> These scores are computed from page structure analysis.
            Higher clarity and trust scores indicate stronger foundations. Lower friction scores show
            easier conversion paths. Check recommendations below for specific improvements.
          </div>
        </div>
      </div>
    </div>
  );
}
