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
    High: 'bg-brand-danger/10 text-brand-danger border-brand-danger/30',
    Medium: 'bg-brand-gold/10 text-brand-gold border-brand-gold/30',
    Low: 'bg-brand-success/10 text-brand-success border-brand-success/30',
  };

  return (
    <div className="bg-brand-surface border-[4px] border-brand-gray-border rounded p-5 hover:border-brand-gold/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className={`px-3 py-1.5 rounded text-xs font-black border-[4px] ${priorityColors[insight.priority as keyof typeof priorityColors]}`}>
          {insight.priority.toUpperCase()} PRIORITY
        </span>
        <span className="text-xs text-brand-text-secondary bg-brand-gray-dark px-2 py-1 rounded font-bold border-[4px] border-brand-gray-border">
          {insight.stage.toUpperCase()}
        </span>
      </div>

      <h3 className="font-black text-lg mb-2 text-white">{insight.title}</h3>
      <p className="text-sm text-brand-text-secondary mb-3">{insight.description}</p>

      <div className="mb-3 p-3 bg-brand-black border-[4px] border-brand-gray-border rounded">
        <p className="text-xs font-black text-brand-gold mb-1">WHY THIS WORKS:</p>
        <p className="text-xs text-white">{insight.principle}</p>
      </div>

      {insight.before && insight.after && (
        <div className="mb-3 space-y-2">
          <div className="p-2 bg-brand-gray-dark border-[4px] border-brand-danger/30 rounded text-xs">
            <span className="font-black text-brand-danger">BEFORE:</span>
            <p className="text-white mt-1">"{insight.before}"</p>
          </div>
          <div className="p-2 bg-brand-gray-dark border-[4px] border-brand-success/30 rounded text-xs">
            <span className="font-black text-brand-success">AFTER:</span>
            <p className="text-white mt-1">"{insight.after}"</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-brand-success font-bold">
          Expected lift: {insight.expectedLift}
        </span>
        <span className="text-brand-text-secondary">
          {insight.difficulty} to implement
        </span>
      </div>
    </div>
  );
}