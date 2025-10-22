'use client';

import Link from 'next/link';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import { CSVUploadAnalysis } from '@/components/CSVUploadAnalysis';

function OnsitePollAnalysisContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="heading-page">On-Site Poll</h1>
          </div>
          <p className="text-body-secondary">Analyze customer preferences and decision factors from onsite polls</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <CSVUploadAnalysis
          researchType="onsite_poll"
          title="Upload Poll Responses"
          description="Upload your onsite poll data (CSV format) to discover customer preferences, barriers, and decision-making patterns"
          pageTitle="Onsite Poll Analysis"
          pageDescription="Analyze customer preferences and decision factors from onsite polls"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
      </main>
    </div>
  );
}

export default function OnsitePollAnalysisPage() {
  return (
    <WorkspaceGuard>
      <OnsitePollAnalysisContent />
    </WorkspaceGuard>
  );
}
