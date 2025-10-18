interface BeforeAfterProps {
  before: string;
  after: string;
}

export function BeforeAfter({ before, after }: BeforeAfterProps) {
  return (
    <div className="space-y-3">
      <div className="p-4 bg-brand-gray-dark border-[4px] border-brand-danger/30 rounded">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black text-brand-danger">BEFORE</span>
        </div>
        <p className="text-sm text-white">"{before}"</p>
      </div>

      <div className="flex items-center justify-center">
        <svg
          className="w-6 h-6 text-brand-gold"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>

      <div className="p-4 bg-brand-gray-dark border-[4px] border-brand-success/30 rounded">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black text-brand-success">AFTER</span>
        </div>
        <p className="text-sm text-white">"{after}"</p>
      </div>
    </div>
  );
}
