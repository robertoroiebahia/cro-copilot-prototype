interface InsightCardProps {
  insight: {
    priority: string;
    title: string;
    description: string;
    principle: string;
    expectedLift: string;
    before?: string;
    after?: string;
    difficulty: string;
    stage: string;
  };
}

export function InsightCard({ insight }: InsightCardProps) {
  const priorityColors = {
    High: 'bg-red-100 text-red-800 border-red-300',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Low: 'bg-green-100 text-green-800 border-green-300',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${priorityColors[insight.priority as keyof typeof priorityColors]}`}>
          {insight.priority} Priority
        </span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {insight.stage.toUpperCase()}
        </span>
      </div>

      <h3 className="font-semibold text-lg mb-2">{insight.title}</h3>
      <p className="text-sm text-gray-600 mb-3">{insight.description}</p>

      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs font-medium text-blue-900 mb-1">Why This Works:</p>
        <p className="text-xs text-blue-700">{insight.principle}</p>
      </div>

      {insight.before && insight.after && (
        <div className="mb-3 space-y-2">
          <div className="p-2 bg-red-50 rounded text-xs">
            <span className="font-medium text-red-900">Before:</span>
            <p className="text-red-700 mt-1">"{insight.before}"</p>
          </div>
          <div className="p-2 bg-green-50 rounded text-xs">
            <span className="font-medium text-green-900">After:</span>
            <p className="text-green-700 mt-1">"{insight.after}"</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-green-600 font-medium">
          Expected lift: {insight.expectedLift}
        </span>
        <span className="text-gray-500">
          {insight.difficulty} to implement
        </span>
      </div>
    </div>
  );
}