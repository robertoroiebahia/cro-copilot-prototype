'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface QueuedTest {
  id: string;
  analysis_id: string;
  title: string;
  hypothesis: string;
  type: 'recommendation' | 'issue';
  impact: string;
  priority: string;
  expected_lift: string;
  confidence: string;
  effort: string;
  status: 'queued' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  position: number;
  created_at: string;
  kpi?: string;
  current_state?: string;
  proposed_change?: string;
}

export default function QueuePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tests, setTests] = useState<QueuedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'queued' | 'in_progress' | 'completed'>('queued');

  useEffect(() => {
    loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadTests = async () => {
    setLoading(true);
    setError(null);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace('/login');
      return;
    }

    let query = supabase
      .from('test_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Failed to fetch tests:', fetchError);
      setError(`Failed to load test queue: ${fetchError.message}`);
      setTests([]);
    } else {
      setTests(data || []);
    }

    setLoading(false);
  };

  const updateStatus = async (testId: string, newStatus: QueuedTest['status']) => {
    const { error } = await supabase
      .from('test_queue')
      .update({
        status: newStatus,
        ...(newStatus === 'in_progress' && { started_at: new Date().toISOString() }),
        ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
      })
      .eq('id', testId);

    if (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update test status');
    } else {
      loadTests();
    }
  };

  const deleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to remove this test from the queue?')) {
      return;
    }

    const { error } = await supabase
      .from('test_queue')
      .delete()
      .eq('id', testId);

    if (error) {
      console.error('Failed to delete test:', error);
      alert('Failed to remove test from queue');
    } else {
      loadTests();
    }
  };

  const filteredCounts = useMemo(() => {
    return {
      all: tests.length,
      queued: tests.filter(t => t.status === 'queued').length,
      in_progress: tests.filter(t => t.status === 'in_progress').length,
      completed: tests.filter(t => t.status === 'completed').length,
    };
  }, [tests]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading your test queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Test Prioritization Queue</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {tests.length} {tests.length === 1 ? 'test' : 'tests'} in your optimization pipeline
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-white text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-sm border border-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { key: 'all', label: 'All Tests' },
              { key: 'queued', label: 'Queued' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  filter === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                  {filteredCounts[key as keyof typeof filteredCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Error Loading Queue</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {tests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                {filter === 'all' ? 'No tests in queue' : `No ${filter.replace('_', ' ')} tests`}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Start adding tests from your analysis results to build your optimization roadmap.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                View Analyses
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map((test, index) => (
              <TestCard
                key={test.id}
                test={test}
                index={index}
                onUpdateStatus={updateStatus}
                onDelete={deleteTest}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface TestCardProps {
  test: QueuedTest;
  index: number;
  onUpdateStatus: (testId: string, newStatus: QueuedTest['status']) => void;
  onDelete: (testId: string) => void;
}

function TestCard({ test, index, onUpdateStatus, onDelete }: TestCardProps) {
  const impactColors = {
    High: 'bg-red-100 text-red-800 border-red-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Low: 'bg-green-100 text-green-800 border-green-200',
  };

  const statusColors = {
    queued: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm font-bold text-blue-700">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{test.title}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[test.status]}`}>
                {test.status.replace('_', ' ')}
              </span>
              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${impactColors[test.impact as keyof typeof impactColors] || impactColors.Medium}`}>
                {test.impact} Impact
              </span>
              <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {test.confidence} Confidence
              </span>
              <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                {test.effort} Effort
              </span>
              <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                {test.expected_lift} lift
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hypothesis */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Hypothesis</p>
        <p className="text-sm text-gray-900 italic">"{test.hypothesis}"</p>
      </div>

      {/* Current vs Proposed */}
      {test.current_state && test.proposed_change && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <span>❌</span>
              <p className="text-xs font-semibold text-gray-600 uppercase">Current</p>
            </div>
            <p className="text-sm text-gray-700">{test.current_state}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <span>✅</span>
              <p className="text-xs font-semibold text-green-700 uppercase">Proposed</p>
            </div>
            <p className="text-sm text-gray-700">{test.proposed_change}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
        {test.status === 'queued' && (
          <button
            onClick={() => onUpdateStatus(test.id, 'in_progress')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Test
          </button>
        )}
        {test.status === 'in_progress' && (
          <>
            <button
              onClick={() => onUpdateStatus(test.id, 'completed')}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Mark Complete
            </button>
            <button
              onClick={() => onUpdateStatus(test.id, 'paused')}
              className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Pause
            </button>
          </>
        )}
        {test.status === 'paused' && (
          <button
            onClick={() => onUpdateStatus(test.id, 'in_progress')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Resume
          </button>
        )}
        <Link
          href={`/dashboard/results/${test.analysis_id}`}
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          View Analysis
        </Link>
        <button
          onClick={() => onDelete(test.id)}
          className="ml-auto px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-300 hover:bg-red-50 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
