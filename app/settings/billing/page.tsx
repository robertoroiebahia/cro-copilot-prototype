'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/lib/billing/useSubscription';
import WorkspaceGuard from '@/components/WorkspaceGuard';

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, loading, isPro, isFree, refetch } = useSubscription();
  const [upgrading, setUpgrading] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for success parameter and refetch subscription
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      setShowSuccess(true);
      refetch();
      setTimeout(() => {
        router.replace('/settings/billing');
        setShowSuccess(false);
      }, 5000);
    }
  }, [searchParams, refetch, router]);

  const handleUpgrade = async (billingCycle: 'monthly' | 'annual') => {
    setUpgrading(true);
    try {
      const priceId = billingCycle === 'monthly'
        ? 'price_1SL7iVE9SvE9VQCTTR9cg5ox'
        : 'price_1SL7jrE9SvE9VQCTfLiUUS82';

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, billingCycle }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout. Please try again.');
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
      setManagingBilling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-5 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-green-900 mb-1">Welcome to Pro!</h3>
            <p className="text-sm text-green-800 leading-relaxed">
              Your subscription has been activated. You now have access to all Pro features including 50 analyses per month, all research types, and priority support.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Card - Enhanced */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
        <div className={`px-6 py-4 ${isPro ? 'bg-gradient-to-r from-brand-gold to-yellow-400' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPro ? 'bg-white/90 shadow-sm' : 'bg-white'}`}>
                <svg className={`w-7 h-7 ${isPro ? 'text-brand-gold' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className={`text-2xl font-black ${isPro ? 'text-black' : 'text-brand-black'}`}>
                    {subscription?.plan_name || 'Free Plan'}
                  </h2>
                  {isPro && (
                    <span className="px-2.5 py-1 bg-white text-brand-gold border-2 border-brand-gold text-xs font-black rounded-md uppercase tracking-wide shadow-sm">
                      Active
                    </span>
                  )}
                </div>
                <p className={`text-sm font-medium ${isPro ? 'text-black/70' : 'text-brand-text-secondary'}`}>
                  {subscription?.plan_description || 'Perfect for trying out the platform'}
                </p>
              </div>
            </div>

            {isPro && subscription?.stripe_customer_id && (
              <button
                onClick={handleManageBilling}
                disabled={managingBilling}
                className="px-5 py-2.5 bg-black text-white rounded-lg text-sm font-black hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 shadow-md"
              >
                {managingBilling ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  'Manage Subscription'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Subscription Details */}
        {isPro && subscription && (
          <div className="px-6 py-5 border-t-2 border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Billing Cycle</div>
                <div className="text-base font-black text-brand-black capitalize">
                  {subscription.billing_cycle}
                </div>
              </div>
              {subscription.current_period_end && (
                <div>
                  <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Renews On</div>
                  <div className="text-base font-black text-brand-black">
                    {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Payment Method</div>
                <div className="text-base font-black text-brand-black">
                  Visa •••• 4242
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plan Limits Card - Enhanced */}
      {subscription?.limits && (
        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-gray-50 border-b-2 border-gray-200">
            <h3 className="text-lg font-black text-brand-black flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Your Plan Limits
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  label: 'Analyses per month',
                  value: subscription.limits.analyses_per_month,
                  icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                },
                {
                  label: 'Workspaces',
                  value: subscription.limits.workspaces_max,
                  icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                },
                {
                  label: 'Experiments per month',
                  value: subscription.limits.experiments_per_month,
                  icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                },
                {
                  label: 'Team members',
                  value: subscription.limits.team_members_max,
                  icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                },
              ].map((limit) => (
                <div key={limit.label} className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-brand-gold">{limit.icon}</span>
                    <span className="text-sm font-bold text-gray-700">{limit.label}</span>
                  </div>
                  <span className="text-lg font-black text-brand-black">
                    {limit.value === -1 ? '∞' : limit.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Options (only show if free) - Enhanced */}
      {isFree && (
        <div>
          <div className="mb-5">
            <h2 className="text-2xl font-black text-brand-black mb-2">Unlock Pro Features</h2>
            <p className="text-brand-text-secondary">Get unlimited access to all research types and premium features</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly Plan - Enhanced */}
            <div className="group bg-white rounded-xl border-2 border-gray-200 p-7 hover:border-brand-gold hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />

              <div className="relative">
                <div className="mb-6">
                  <div className="inline-block px-3 py-1 bg-gray-100 rounded-lg mb-3">
                    <span className="text-xs font-black text-gray-600 uppercase tracking-wide">Monthly</span>
                  </div>
                  <h3 className="text-2xl font-black text-brand-black mb-2">Pro Plan</h3>
                  <p className="text-sm text-brand-text-secondary">Perfect for growing businesses</p>
                </div>

                <div className="mb-7">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-black text-brand-black">$79</span>
                    <span className="text-xl text-brand-text-secondary font-bold">/mo</span>
                  </div>
                  <p className="text-xs text-brand-text-tertiary font-medium">Billed monthly, cancel anytime</p>
                </div>

                <div className="space-y-3.5 mb-7">
                  {[
                    '50 analyses per month',
                    'Unlimited insights & themes',
                    'All research types',
                    '3 workspaces',
                    'Priority email support',
                    '90 days data retention',
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleUpgrade('monthly')}
                  disabled={upgrading}
                  className="w-full btn-primary px-6 py-4 rounded-xl text-base shadow-md hover:shadow-lg group-hover:scale-[1.02]"
                >
                  {upgrading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Start Monthly Plan'
                  )}
                </button>
              </div>
            </div>

            {/* Annual Plan - Enhanced with "Best Value" Badge */}
            <div className="group bg-gradient-to-br from-brand-gold via-yellow-400 to-yellow-500 rounded-xl border-2 border-yellow-600 p-7 relative overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-300/50 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />

              <div className="relative">
                {/* Badges side by side at top */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-block px-3 py-1 bg-white border-2 border-brand-black rounded-lg">
                    <span className="text-xs font-black text-brand-black uppercase tracking-wide">Annual</span>
                  </div>
                  <div className="inline-block px-3 py-1 bg-white border-2 border-brand-black rounded-lg">
                    <span className="text-xs font-black text-brand-black uppercase tracking-wide">Save $158</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-black text-brand-black mb-2">Pro Plan</h3>
                  <p className="text-sm text-brand-black/90 font-bold">Perfect for growing businesses</p>
                </div>

                <div className="mb-7">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-black text-brand-black">$790</span>
                    <span className="text-xl text-brand-black/80 font-bold">/yr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-brand-black font-black">
                      $65.83/month
                    </p>
                    <span className="text-xs text-brand-black/70 font-medium line-through">$79/month</span>
                  </div>
                </div>

                <div className="space-y-3.5 mb-7">
                  {[
                    'Everything in Monthly plan',
                    '2 months completely FREE',
                    'Best value for money',
                    'Lock in current pricing',
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-brand-black rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-3.5 h-3.5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-brand-black font-bold">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleUpgrade('annual')}
                  disabled={upgrading}
                  className="w-full btn-primary px-6 py-4 rounded-xl text-base shadow-xl hover:shadow-2xl group-hover:scale-[1.02]"
                >
                  {upgrading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Start Annual Plan'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="mt-8 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-blue-900 mb-1">Risk-Free Guarantee</h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Try Pro risk-free. Cancel anytime with no questions asked. Your data stays safe and you can downgrade to Free plan without losing your analyses.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <WorkspaceGuard>
      <BillingContent />
    </WorkspaceGuard>
  );
}
