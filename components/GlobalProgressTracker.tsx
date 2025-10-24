'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ProgressJob {
  id: string;
  type: 'csv_analysis' | 'page_analysis' | 'ga_sync' | 'hypothesis_generation';
  title: string;
  status: 'running' | 'completed' | 'failed';
  progress?: number; // 0-100
  resultUrl?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export default function GlobalProgressTracker() {
  const [jobs, setJobs] = useState<ProgressJob[]>([]);
  const [minimized, setMinimized] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Listen for progress events
    const handleProgressUpdate = (event: CustomEvent<ProgressJob>) => {
      const job = event.detail;

      setJobs(prev => {
        const existingIndex = prev.findIndex(j => j.id === job.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = job;
          return updated;
        }
        return [...prev, job];
      });

      // Auto-remove completed/failed jobs after 10 seconds
      if (job.status === 'completed' || job.status === 'failed') {
        setTimeout(() => {
          setJobs(prev => prev.filter(j => j.id !== job.id));
        }, 10000);
      }
    };

    window.addEventListener('progress-update' as any, handleProgressUpdate);
    return () => window.removeEventListener('progress-update' as any, handleProgressUpdate);
  }, []);

  const activeJobs = jobs.filter(j => j.status === 'running');
  const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'failed');

  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
      {/* Active Jobs */}
      {activeJobs.map(job => (
        <div
          key={job.id}
          className={`bg-white rounded-lg shadow-lg border-2 border-purple-200 overflow-hidden transition-all duration-300 ${
            minimized.has(job.id) ? 'w-64' : 'w-96'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 flex items-center justify-between border-b border-purple-200">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full">
                  <div className="absolute inset-0 animate-ping bg-purple-400 rounded-full opacity-75"></div>
                </div>
              </div>
              <span className="text-sm font-black text-purple-900">{job.title}</span>
            </div>
            <button
              onClick={() => {
                setMinimized(prev => {
                  const next = new Set(prev);
                  if (next.has(job.id)) {
                    next.delete(job.id);
                  } else {
                    next.add(job.id);
                  }
                  return next;
                });
              }}
              className="text-purple-600 hover:text-purple-800"
            >
              {minimized.has(job.id) ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>

          {/* Body */}
          {!minimized.has(job.id) && (
            <div className="p-4">
              {/* Progress Bar */}
              <div className="relative h-2 bg-purple-200 rounded-full overflow-hidden mb-3">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 transition-all duration-300"
                  style={{
                    width: `${job.progress || 0}%`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s ease-in-out infinite',
                  }}
                ></div>
              </div>

              {/* Status Messages */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-purple-800">
                  <svg className="w-4 h-4 text-green-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-bold">Processing your request</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-purple-800">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="font-medium">AI is analyzing data</span>
                </div>
              </div>

              {/* Progress Percentage */}
              {job.progress !== undefined && (
                <div className="mt-3 text-right">
                  <span className="text-xs font-black text-purple-900">{Math.round(job.progress)}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Completed Jobs */}
      {completedJobs.map(job => (
        <div
          key={job.id}
          className={`bg-white rounded-lg shadow-lg border-2 overflow-hidden transition-all duration-300 ${
            job.status === 'completed' ? 'border-green-200' : 'border-red-200'
          }`}
        >
          <div className={`px-4 py-3 flex items-center justify-between ${
            job.status === 'completed' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="flex items-center gap-2 flex-1">
              {job.status === 'completed' ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div className="flex-1">
                <p className={`text-sm font-bold ${job.status === 'completed' ? 'text-green-900' : 'text-red-900'}`}>
                  {job.status === 'completed' ? 'Analysis Complete!' : 'Analysis Failed'}
                </p>
                <p className={`text-xs ${job.status === 'completed' ? 'text-green-700' : 'text-red-700'}`}>
                  {job.status === 'completed' ? job.title : job.error || 'An error occurred'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {job.status === 'completed' && job.resultUrl && (
                <Link
                  href={job.resultUrl}
                  className="px-3 py-1 bg-green-600 text-white text-xs font-black rounded hover:bg-green-700 transition-colors"
                >
                  View
                </Link>
              )}
              <button
                onClick={() => setJobs(prev => prev.filter(j => j.id !== job.id))}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function to emit progress events
export function emitProgress(job: Partial<ProgressJob> & { id: string }) {
  const event = new CustomEvent('progress-update', {
    detail: {
      ...job,
      startedAt: job.startedAt || new Date(),
    },
  });
  window.dispatchEvent(event);
}
