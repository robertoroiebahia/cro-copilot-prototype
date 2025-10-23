'use client';

interface ProBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  tooltip?: boolean;
  className?: string;
}

export default function ProBadge({ size = 'md', tooltip = false, className = '' }: ProBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const badge = (
    <span
      className={`
        inline-flex items-center justify-center
        bg-gradient-to-r from-brand-gold to-yellow-500
        text-brand-black font-black uppercase tracking-wide
        rounded border border-yellow-600/20 shadow-sm
        ${sizeClasses[size]}
        ${className}
      `}
      title={tooltip ? 'This feature requires a Pro subscription' : undefined}
    >
      PRO
    </span>
  );

  if (tooltip) {
    return (
      <div className="relative group inline-block">
        {badge}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          This feature requires Pro
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    );
  }

  return badge;
}
