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
  const [allTests, setAllTests] = useState<QueuedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'queued' | 'in_progress' | 'completed'>('queued');

  useEffect(() => {
    loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTests = async () => {
    setLoading(true);
    setError(null);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace('/login');
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('test_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch tests:', fetchError);
      setError(`Failed to load test queue: ${fetchError.message}`);
      setAllTests([]);
    } else {
      setAllTests(data || []);
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

  const tests = useMemo(() => {
    if (filter === 'all') return allTests;
    return allTests.filter(t => t.status === filter);
  }, [allTests, filter]);

  const filteredCounts = useMemo(() => {
    return {
      all: allTests.length,
      queued: allTests.filter(t => t.status === 'queued').length,
      in_progress: allTests.filter(t => t.status === 'in_progress').length,
      completed: allTests.filter(t => t.status === 'completed').length,
    };
  }, [allTests]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white  flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-base text-brand-text-secondary font-bold">Loading your test queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white ">
      {/* Page Header - Premium Design */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6">
            <Link href="/dashboard" className="text-brand-text-tertiary hover:text-brand-gold transition-all duration-200 font-bold">
              Dashboard
            </Link>
            <svg className="w-4 h-4 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-brand-black font-black">Test Queue</span>
          </nav>

          {/* Header Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6"
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-brand-gold rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-brand-black">Test Queue</h1>
                </div>
                <p className="text-sm text-brand-text-secondary font-medium">
                  {tests.length} {tests.length === 1 ? 'test' : 'tests'} in your optimization pipeline
                </p>
              </div>
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white text-sm font-black rounded-lg hover:bg-brand-gold hover:text-black transition-all duration-300"
                style={{
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)'
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Analysis
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Clean Tabs */}
      <div className="bg-white border-b border-gray-200"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { key: 'all', label: 'All Tests' },
              { key: 'queued', label: 'Queued' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`px-6 py-4 text-sm font-black whitespace-nowrap border-b-2 transition-all duration-300 ${
                  filter === key
                    ? 'border-brand-gold text-brand-gold'
                    : 'border-transparent text-brand-text-tertiary hover:text-brand-gold hover:border-gray-300'
                }`}
              >
                {label}
                <span className={`ml-2 px-2.5 py-1 text-xs rounded-lg border transition-all duration-300 ${
                  filter === key
                    ? 'bg-brand-gold text-black border-brand-gold'
                    : 'bg-gray-50 text-brand-text-secondary border-gray-200'
                }`}>
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
          <div className="bg-white rounded-lg border border-red-200 p-6 mb-6"
            style={{
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.1)'
            }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-brand-black mb-1">Error Loading Queue</h3>
                <p className="text-sm text-brand-text-secondary">{error}</p>
              </div>
            </div>
          </div>
        )}

        {tests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center"
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-brand-black mb-2">
                {filter === 'all' ? 'No tests in queue' : `No ${filter.replace('_', ' ')} tests`}
              </h3>
              <p className="text-sm text-brand-text-secondary font-medium mb-6">
                Start adding tests from your analysis results to build your optimization roadmap.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-sm font-black rounded-lg hover:bg-brand-gold hover:text-black transition-all duration-300"
                style={{
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)'
                }}
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = {
    queued: {
      label: 'Queued',
      color: '#F5C542',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    in_progress: {
      label: 'In Progress',
      color: '#3E6DF4',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    completed: {
      label: 'Completed',
      color: '#10B981',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    paused: {
      label: 'Paused',
      color: '#9CA3AF',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    cancelled: {
      label: 'Cancelled',
      color: '#EF4444',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    },
  };

  const statusInfo = statusConfig[test.status];

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)'
          : '0 2px 8px rgba(0, 0, 0, 0.04)',
        borderColor: isHovered ? '#F5C542' : undefined,
      }}
    >
      {/* Collapsible Header */}
      <div
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title with Status Indicator */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}
              >
                {statusInfo.icon}
              </div>
              <h3 className="text-lg font-black text-brand-black flex-1">{test.title}</h3>
            </div>

            {/* Compact Badges Row */}
            <div className="flex flex-wrap gap-2 mb-3">
              {/* Status Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black"
                style={{
                  backgroundColor: statusInfo.color + '20',
                  color: statusInfo.color,
                  border: `1px solid ${statusInfo.color}40`
                }}
              >
                {statusInfo.label}
              </span>

              {/* Priority */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-gray-100 text-brand-text-secondary border border-gray-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {test.priority}
              </span>

              {/* Metrics */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-brand-text-secondary border border-gray-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {test.impact} Impact
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-brand-text-secondary border border-gray-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {test.effort} Effort
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                {test.expected_lift}
              </span>
            </div>

            {/* Hypothesis Preview - Only when collapsed */}
            {!isExpanded && (
              <p className="text-sm text-brand-text-secondary line-clamp-2 italic">
                "{test.hypothesis}"
              </p>
            )}
          </div>

          {/* Expand Icon */}
          <div className={`transform transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-6 h-6 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-4 bg-gray-50 border-t border-gray-200 space-y-4">
          {/* Full Hypothesis */}
          <div className="p-5 bg-white rounded-lg border border-gray-200"
            style={{
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div className="text-xs font-black text-brand-text-tertiary uppercase tracking-wide">Test Hypothesis</div>
            </div>
            <p className="text-sm text-brand-black italic leading-relaxed">"{test.hypothesis}"</p>
          </div>

          {/* Current vs Proposed */}
          {test.current_state && test.proposed_change && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-lg border-l-4 border-red-500"
                style={{
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div className="text-xs font-black text-red-700 uppercase tracking-wide">Current</div>
                </div>
                <p className="text-sm text-brand-text-secondary leading-relaxed">{test.current_state}</p>
              </div>
              <div className="p-5 bg-white rounded-lg border-l-4 border-green-500"
                style={{
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="text-xs font-black text-green-700 uppercase tracking-wide">Proposed</div>
                </div>
                <p className="text-sm text-brand-text-secondary leading-relaxed">{test.proposed_change}</p>
              </div>
            </div>
          )}

          {/* KPI */}
          {test.kpi && (
            <div className="p-5 bg-white rounded-lg border border-gray-200"
              style={{
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="text-xs font-black text-brand-text-tertiary uppercase tracking-wide">Primary KPI</div>
              </div>
              <p className="text-sm text-brand-black font-bold">{test.kpi}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {test.status === 'queued' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(test.id, 'in_progress');
                }}
                className="px-6 py-3 bg-black text-white text-sm font-black rounded-lg hover:bg-brand-gold hover:text-black transition-all duration-300"
                style={{
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)'
                }}
              >
                Start Test
              </button>
            )}
            {test.status === 'in_progress' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(test.id, 'completed');
                  }}
                  className="px-6 py-3 bg-black text-white text-sm font-black rounded-lg hover:bg-brand-gold hover:text-black transition-all duration-300"
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  Mark Complete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(test.id, 'paused');
                  }}
                  className="px-6 py-3 bg-white text-brand-black text-sm font-black rounded-lg border border-gray-200 hover:border-brand-gold hover:bg-brand-gold/10 transition-all duration-300"
                >
                  Pause
                </button>
              </>
            )}
            {test.status === 'paused' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(test.id, 'in_progress');
                }}
                className="px-6 py-3 bg-black text-white text-sm font-black rounded-lg hover:bg-brand-gold hover:text-black transition-all duration-300"
                style={{
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)'
                }}
              >
                Resume
              </button>
            )}
            <Link
              href={`/dashboard/results/${test.analysis_id}`}
              className="px-6 py-3 bg-white text-brand-black text-sm font-black rounded-lg border border-gray-200 hover:border-brand-gold hover:bg-brand-gold/10 transition-all duration-300"
            >
              View Analysis
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(test.id);
              }}
              className="ml-auto px-6 py-3 bg-white text-red-600 text-sm font-black rounded-lg border border-red-200 hover:bg-red-50 hover:border-red-400 transition-all duration-300"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
