'use client';

import Link from 'next/link';

export default function ExperimentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-4xl font-black text-brand-black mb-3">Experiments</h1>
          <p className="text-lg text-brand-text-secondary font-medium max-w-2xl mx-auto">
            A/B test tracking with results, statistical significance, and learnings extraction
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center mb-8">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold/10 text-brand-gold text-sm font-black rounded-lg mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              COMING SOON
            </div>
            <h2 className="text-2xl font-black text-brand-black mb-4">
              Complete Experimentation Platform
            </h2>
            <p className="text-brand-text-secondary mb-8 leading-relaxed">
              Track A/B tests from setup to completion. Manage variations, monitor results in real-time, calculate statistical significance, declare winners, and extract learnings to feed back into insights.
            </p>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-brand-black mb-2">Live Results</h3>
            <p className="text-sm text-brand-text-secondary">Real-time tracking of conversions and metrics</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-brand-black mb-2">Statistical Rigor</h3>
            <p className="text-sm text-brand-text-secondary">Auto-calculated significance and confidence intervals</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-brand-black mb-2">Learning Loop</h3>
            <p className="text-sm text-brand-text-secondary">Extract insights from results to improve future tests</p>
          </div>
        </div>

        {/* Experiment Dashboard Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h3 className="text-lg font-black text-brand-black mb-6 text-center">Experiment Dashboard Preview</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-gray-900">Mobile Trust Badge Test</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Running</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black text-gray-900">2.3%</div>
                  <div className="text-xs text-gray-600">Control CVR</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-green-600">3.2%</div>
                  <div className="text-xs text-gray-600">Treatment CVR</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600">Lift: <span className="font-bold text-green-600">+39%</span> • Significance: 99%</div>
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4 opacity-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-gray-900">Hero CTA Copy Test</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded">Draft</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black text-gray-400">--</div>
                  <div className="text-xs text-gray-600">Control</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-gray-400">--</div>
                  <div className="text-xs text-gray-600">Treatment</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600">Scheduled to start</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex justify-center gap-4">
          <Link
            href="/hypotheses"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
          >
            View Hypotheses
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-brand-text-secondary text-sm font-bold rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
