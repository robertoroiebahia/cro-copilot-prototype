'use client';

import { useRouter } from 'next/navigation';

interface UsageLimitBannerProps {
  resourceType: 'analyses' | 'insights' | 'themes' | 'hypotheses' | 'experiments';
  current: number;
  limit: number;
  period?: 'month' | 'total';
  onUpgrade?: () => void;
}

const RESOURCE_INFO = {
  analyses: {
    label: 'analyses',
    icon: '📊',
    unit: 'analysis',
  },
  insights: {
    label: 'insights',
    icon: '💡',
    unit: 'insight',
  },
  themes: {
    label: 'themes',
    icon: '🎯',
    unit: 'theme',
  },
  hypotheses: {
    label: 'hypotheses',
    icon: '🔬',
    unit: 'hypothesis',
  },
  experiments: {
    label: 'experiments',
    icon: '🧪',
    unit: 'experiment',
  },
};

export default function UsageLimitBanner({
  resourceType,
  current,
  limit,
  period = 'month',
  onUpgrade,
}: UsageLimitBannerProps) {
  const router = useRouter();

  // Don't show banner if unlimited
  if (limit === -1) {
    return null;
  }

  const percentage = (current / limit) * 100;
  const remaining = Math.max(0, limit - current);
  const resourceInfo = RESOURCE_INFO[resourceType];

  // Only show when >= 80% used
  if (percentage < 80) {
    return null;
  }

  const isAtLimit = percentage >= 100;
  const isNearLimit = percentage >= 90 && percentage < 100;
  const isWarning = percentage >= 80 && percentage < 90;

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/settings/billing');
    }
  };

  // At limit (100%) - Red, blocking message
  if (isAtLimit) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 animate-in slide-in-from-top duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-red-900 mb-1">
              {resourceInfo.label.charAt(0).toUpperCase() + resourceInfo.label.slice(1)} Limit Reached
            </h4>
            <p className="text-sm text-red-800 leading-relaxed mb-3">
              You've used all <span className="font-black">{limit} {resourceInfo.label}</span> for this {period}.
              {' '}Upgrade to Pro for 10x more.
            </p>
            <button
              onClick={handleUpgradeClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-yellow-500 transition-all shadow-sm"
            >
              <span>Upgrade to Pro</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Near limit (90-99%) - Orange/Yellow warning
  if (isNearLimit) {
    return (
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6 animate-in slide-in-from-top duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-orange-900 mb-1">
              Almost at Your Limit
            </h4>
            <p className="text-sm text-orange-800 leading-relaxed">
              You've used <span className="font-black">{current} of {limit} {resourceInfo.label}</span> this {period}.
              {' '}Only <span className="font-black">{remaining} {remaining === 1 ? resourceInfo.unit : resourceInfo.label}</span> remaining.
              {' '}
              <button
                onClick={handleUpgradeClick}
                className="inline text-orange-900 font-black underline hover:text-orange-950"
              >
                Upgrade for 10x more →
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Warning (80-89%) - Yellow info banner
  if (isWarning) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6 animate-in slide-in-from-top duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-yellow-900 leading-relaxed">
              You've used <span className="font-black">{current} of {limit} {resourceInfo.label}</span> this {period}.
              {' '}
              <button
                onClick={handleUpgradeClick}
                className="inline text-yellow-900 font-black underline hover:text-yellow-950"
              >
                Upgrade to Pro for 10x more →
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
