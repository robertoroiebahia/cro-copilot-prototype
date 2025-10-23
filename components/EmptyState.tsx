// EmptyState Component
// Reusable component for showing empty states with illustrations and CTAs

import Link from 'next/link';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  illustration?: 'search' | 'rocket' | 'lightbulb' | 'flask' | 'chart' | 'folder';
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  secondaryActionLabel,
  secondaryActionHref,
  illustration = 'rocket',
}: EmptyStateProps) {
  // Illustration SVGs
  const illustrations = {
    search: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    rocket: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    lightbulb: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    flask: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    chart: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    folder: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 p-12 text-center">
      {/* Illustration */}
      <div className="mb-6 flex justify-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
          {illustrations[illustration]}
        </div>
      </div>

      {/* Icon */}
      <div className="mb-4 flex justify-center">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-gold to-yellow-400 rounded-xl flex items-center justify-center shadow-md">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-black text-brand-black mb-3">
        {title}
      </h3>

      {/* Description */}
      <p className="text-base text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {actionLabel && (actionHref || actionOnClick) && (
          <>
            {actionHref ? (
              <Link
                href={actionHref}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-gold to-yellow-400 hover:from-yellow-400 hover:to-brand-gold text-black font-black rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {actionLabel}
              </Link>
            ) : (
              <button
                onClick={actionOnClick}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-gold to-yellow-400 hover:from-yellow-400 hover:to-brand-gold text-black font-black rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {actionLabel}
              </button>
            )}
          </>
        )}

        {secondaryActionLabel && secondaryActionHref && (
          <Link
            href={secondaryActionHref}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 hover:border-brand-gold text-gray-700 hover:text-black font-bold rounded-xl transition-all duration-200"
          >
            {secondaryActionLabel}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
