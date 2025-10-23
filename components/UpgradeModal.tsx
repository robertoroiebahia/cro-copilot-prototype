'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
  limitType?: 'analyses' | 'insights' | 'themes' | 'hypotheses' | 'experiments' | 'feature';
  currentUsage?: number;
  limit?: number;
}

const FEATURE_BENEFITS = {
  analyses: {
    title: 'analyses per month',
    icon: '📊',
    multiplier: '10x',
    benefits: [
      '50 analyses per month (vs 5)',
      'All analysis types unlocked',
      'Unlimited insights & themes',
      'Priority support',
    ],
  },
  insights: {
    title: 'total insights',
    icon: '💡',
    multiplier: '10x',
    benefits: [
      '500 total insights (vs 50)',
      'Manual insight creation',
      'Advanced filtering & search',
      'Export to CSV',
    ],
  },
  themes: {
    title: 'total themes',
    icon: '🎯',
    multiplier: '10x',
    benefits: [
      '100 total themes (vs 10)',
      'Theme editing & merging',
      'Custom categorization',
      'Export & sharing',
    ],
  },
  hypotheses: {
    title: 'total hypotheses',
    icon: '🔬',
    multiplier: '10x',
    benefits: [
      '50 total hypotheses (vs 5)',
      'Hypothesis editing & prioritization',
      'Impact scoring',
      'Export to experimentation tools',
    ],
  },
  experiments: {
    title: 'experiments per month',
    icon: '🧪',
    multiplier: '10x',
    benefits: [
      '20 experiments per month (vs 2)',
      'Advanced experiment tracking',
      'Statistical significance calculator',
      'Experiment history',
    ],
  },
  feature: {
    title: '',
    icon: '⭐',
    multiplier: 'Pro',
    benefits: [
      'All analysis types (Survey, Review Mining, Heatmaps, etc.)',
      '10x more analyses & resources',
      'Advanced features & editing',
      'Priority support',
    ],
  },
};

export default function UpgradeModal({
  open,
  onClose,
  feature,
  limitType = 'feature',
  currentUsage,
  limit,
}: UpgradeModalProps) {
  const router = useRouter();

  if (!open) return null;

  const featureInfo = FEATURE_BENEFITS[limitType];
  const isAtLimit = currentUsage !== undefined && limit !== undefined;

  const handleUpgrade = () => {
    onClose();
    router.push('/settings/billing');
  };

  const handleViewPlans = () => {
    onClose();
    router.push('/settings/billing');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 w-full max-w-md mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 px-6 py-5 border-b-2 border-purple-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-gold rounded-xl flex items-center justify-center text-2xl shadow-sm">
                  {featureInfo.icon}
                </div>
                <div>
                  <h2 className="text-xl font-black text-brand-black">
                    {isAtLimit ? 'Limit Reached' : 'Upgrade to Pro'}
                  </h2>
                  {isAtLimit && (
                    <p className="text-sm text-gray-600 font-medium">
                      {currentUsage}/{limit} {featureInfo.title} used
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Message */}
            <div className="mb-6">
              {isAtLimit ? (
                <p className="text-gray-700 leading-relaxed">
                  You've reached your limit of <span className="font-black text-brand-black">{limit} {featureInfo.title}</span>.
                  {' '}Upgrade to Pro to get <span className="font-black text-brand-gold">{featureInfo.multiplier} more</span> and unlock all features.
                </p>
              ) : (
                <p className="text-gray-700 leading-relaxed">
                  <span className="font-black text-brand-black">{feature || 'This feature'}</span> is only available on the Pro plan.
                  {' '}Upgrade to unlock all premium features.
                </p>
              )}
            </div>

            {/* Benefits */}
            <div className="mb-6">
              <p className="text-sm font-black text-gray-900 uppercase tracking-wide mb-3">
                Upgrade to Pro to get:
              </p>
              <ul className="space-y-2">
                {featureInfo.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700 leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing Highlight */}
            <div className="bg-gradient-to-br from-brand-gold/10 to-yellow-50 rounded-xl p-4 mb-6 border border-brand-gold/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-gray-600 uppercase tracking-wide mb-1">
                    Starting at
                  </p>
                  <p className="text-2xl font-black text-brand-black">
                    $49<span className="text-base text-gray-600 font-bold">/month</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500 mb-1">or save 20% with</p>
                  <p className="text-sm font-black text-brand-gold">Annual billing</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleViewPlans}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 text-sm font-black rounded-lg hover:bg-gray-50 transition-all"
              >
                View Plans
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 px-4 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-yellow-500 transition-all shadow-sm hover:shadow-md"
              >
                Upgrade Now
              </button>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-center text-gray-500 mt-4">
              30-day money-back guarantee • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
