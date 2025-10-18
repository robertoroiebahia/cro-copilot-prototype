interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const priorityStyles = {
    High: 'bg-brand-danger/10 text-brand-danger border-brand-danger/30',
    Medium: 'bg-brand-gold/10 text-brand-gold border-brand-gold/30',
    Low: 'bg-brand-success/10 text-brand-success border-brand-success/30',
  };

  return (
    <span
      className={`px-3 py-1.5 rounded text-xs font-black border-[4px] ${
        priorityStyles[priority as keyof typeof priorityStyles] ||
        'bg-brand-surface text-white border-brand-gray-border'
      }`}
    >
      {priority.toUpperCase()} PRIORITY
    </span>
  );
}
