'use client';

import Link from 'next/link';

export default function ThemesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-4xl font-black text-brand-black mb-3">Themes</h1>
          <p className="text-lg text-brand-text-secondary font-medium max-w-2xl mx-auto">
            Clustered patterns from 2-5 related insights showing broader conversion issues
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
              Pattern Recognition Engine
            </h2>
            <p className="text-brand-text-secondary mb-8 leading-relaxed">
              Automatically cluster related insights into actionable themes. Each theme will show business impact, estimated value, recommended actions, and connected insights with relevance weights.
            </p>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-brand-black mb-2">Auto-Clustering</h3>
            <p className="text-sm text-brand-text-secondary">AI groups 2-5 related insights into meaningful patterns</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-brand-black mb-2">Business Impact</h3>
            <p className="text-sm text-brand-text-secondary">See estimated annual revenue impact per theme</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-brand-black mb-2">Action Plan</h3>
            <p className="text-sm text-brand-text-secondary">Get recommended actions ranked by impact & effort</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex justify-center gap-4">
          <Link
            href="/insights"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
          >
            View Insights
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
