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
      status: heuristics.clarity >= 2 ? 'success' : heuristics.clarity === 1 ? 'warning' : 'danger',
    },
    {
      name: 'Trust',
      value: heuristics.trust,
      max: 2,
      description: 'Trust badges & reviews',
      icon: '🛡️',
      status: heuristics.trust >= 2 ? 'success' : heuristics.trust === 1 ? 'warning' : 'danger',
    },
    {
      name: 'Urgency',
      value: heuristics.urgency,
      max: 1,
      description: 'Urgency messaging present',
      icon: '⚡',
      status: heuristics.urgency === 1 ? 'success' : 'danger',
    },
    {
      name: 'Friction',
      value: heuristics.friction,
      max: 1,
      description: 'Form complexity (lower is better)',
      icon: '🚧',
      status: heuristics.friction === 0 ? 'success' : 'danger',
      inverted: true, // For friction, lower is better
    },
  ];

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-brand-success/20 border-brand-success/30';
      case 'warning':
        return 'bg-brand-gold/20 border-brand-gold/30';
      case 'danger':
        return 'bg-brand-danger/20 border-brand-danger/30';
      default:
        return 'bg-brand-surface border-brand-gray-border';
    }
  };

  const getBarColorClasses = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-brand-success';
      case 'warning':
        return 'bg-brand-gold';
      case 'danger':
        return 'bg-brand-danger';
      default:
        return 'bg-brand-gray-border';
    }
  };

  return (
    <div className="bg-white rounded border border-gray-200 p-6 mb-6 hover:border-brand-gold transition-all duration-200">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-black text-black">Page Health Metrics</h2>
        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
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
              className={`border rounded p-4 hover:border-brand-gold hover:bg-brand-gold/10 transition-all duration-200 ${getStatusClasses(metric.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{metric.icon}</span>
                  <div>
                    <h3 className="font-black text-sm text-black">{metric.name}</h3>
                    <p className="text-xs text-gray-600">{metric.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-black">
                    {metric.inverted ? metric.max - metric.value : metric.value}/{metric.max}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded h-2 mt-3">
                <div
                  className={`h-2 rounded transition-all ${getBarColorClasses(metric.status)}`}
                  style={{ width: `${displayPercentage}%` }}
                />
              </div>

              {/* Status text */}
              <div className="mt-2 text-xs font-medium text-black">
                {metric.status === 'success' && (
                  <span>✓ {metric.inverted ? 'Low friction' : 'Good'}</span>
                )}
                {metric.status === 'warning' && (
                  <span>⚠ Needs improvement</span>
                )}
                {metric.status === 'danger' && (
                  <span>✗ {metric.inverted ? 'High friction' : 'Missing'}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <div className="flex items-start gap-2">
          <span className="text-brand-gold text-lg">💡</span>
          <div className="text-sm text-gray-600">
            <strong className="text-black">How to interpret:</strong> These scores are computed from page structure analysis.
            Higher clarity and trust scores indicate stronger foundations. Lower friction scores show
            easier conversion paths. Check recommendations below for specific improvements.
          </div>
        </div>
      </div>
    </div>
  );
}
