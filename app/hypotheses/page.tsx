'use client';

import Link from 'next/link';

export default function HypothesesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🧪</div>
          <h1 className="text-4xl font-black text-brand-black mb-3">Hypotheses</h1>
          <p className="text-lg text-brand-text-secondary font-medium max-w-2xl mx-auto">
            Testable predictions based on themes: "If we [change], then [outcome] because [reasoning]"
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
              Scientific Test Framework
            </h2>
            <p className="text-brand-text-secondary mb-8 leading-relaxed">
              Transform themes into structured, testable hypotheses with expected impact, test design, success metrics, and one-click conversion to experiments.
            </p>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-brand-black mb-2">Structured Format</h3>
            <p className="text-sm text-brand-text-secondary">"If X, then Y because Z" ensures testability</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-brand-black mb-2">Impact Prediction</h3>
            <p className="text-sm text-brand-text-secondary">Expected lift with confidence intervals</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-brand-black mb-2">Test Design</h3>
            <p className="text-sm text-brand-text-secondary">Pre-configured A/B test specs ready to run</p>
          </div>
        </div>

        {/* Status Pipeline Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h3 className="text-lg font-black text-brand-black mb-6 text-center">Hypothesis Lifecycle</h3>
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {['Draft', 'Approved', 'Testing', 'Validated'].map((status, idx) => (
              <div key={status} className="flex items-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 text-gray-400 font-black text-sm">
                    {idx + 1}
                  </div>
                  <div className="text-xs font-bold text-gray-600">{status}</div>
                </div>
                {idx < 3 && (
                  <div className="w-16 h-0.5 bg-gray-200 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex justify-center gap-4">
          <Link
            href="/themes"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
          >
            View Themes
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
