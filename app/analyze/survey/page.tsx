'use client';

import Link from 'next/link';
import WorkspaceGuard from '@/components/WorkspaceGuard';

function SurveyAnalysisContent() {
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex items-center gap-2 text-sm mb-4">
            <Link href="/dashboard" className="text-brand-text-tertiary hover:text-brand-gold transition-all duration-200 font-bold">
              Dashboard
            </Link>
            <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-brand-black font-black">Survey Analysis</span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-black">Survey Analysis</h1>
              <p className="text-sm text-brand-text-secondary font-medium">Extract insights from customer feedback</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg border border-gray-200 p-12 flex flex-col items-center justify-center text-center"
          style={{
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          {/* Icon */}
          <div className="w-20 h-20 bg-purple-50 rounded-lg flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>

          {/* Coming Soon Badge */}
          <div className="mb-4">
            <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase tracking-wide">
              Coming Soon
            </span>
          </div>

          {/* Title & Description */}
          <h2 className="text-2xl font-black text-brand-black mb-4">
            Survey Analysis
          </h2>
          <p className="text-base text-brand-text-secondary max-w-2xl mb-8 font-medium leading-relaxed">
            Upload post-purchase surveys, customer feedback, or user research responses.
            Our AI will analyze open-ended responses, identify common themes, sentiment patterns,
            and extract actionable insights from your qualitative data.
          </p>

          {/* Feature List */}
          <div className="grid md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-black mb-1">Theme Extraction</h3>
                  <p className="text-xs text-brand-text-secondary">Automatically identify recurring topics and concerns</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-black mb-1">Sentiment Analysis</h3>
                  <p className="text-xs text-brand-text-secondary">Understand emotional tone and satisfaction levels</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-black mb-1">Quote Extraction</h3>
                  <p className="text-xs text-brand-text-secondary">Surface compelling customer quotes to support insights</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-black mb-1">Pain Point Mapping</h3>
                  <p className="text-xs text-brand-text-secondary">Prioritize issues based on frequency and impact</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-brand-gold text-white hover:text-black font-black rounded-lg transition-all duration-300"
              style={{
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)'
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Try Page Analysis
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-brand-black font-black rounded-lg border border-gray-200 hover:border-brand-gold/50 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SurveyAnalysisPage() {
  return (
    <WorkspaceGuard>
      <SurveyAnalysisContent />
    </WorkspaceGuard>
  );
}
