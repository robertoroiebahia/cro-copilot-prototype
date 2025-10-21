'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useWorkspace } from './WorkspaceContext';

type ResearchType = 'survey_analysis' | 'onsite_poll' | 'review_mining';

interface CSVUploadAnalysisProps {
  researchType: ResearchType;
  title: string;
  description: string;
  icon: React.ReactNode;
  pageTitle: string;
  pageDescription: string;
}

interface CSVAnalysis {
  id: string;
  url: string;
  created_at: string;
  insights_count?: number;
  metrics?: {
    total_rows?: number;
  };
}

export function CSVUploadAnalysis({
  researchType,
  title,
  description,
  icon,
  pageTitle,
  pageDescription,
}: CSVUploadAnalysisProps) {
  const router = useRouter();
  const supabase = createClient();
  const { selectedWorkspaceId } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // History state
  const [csvAnalyses, setCsvAnalyses] = useState<CSVAnalysis[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch history
  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetchHistory();
  }, [selectedWorkspaceId, researchType]);

  const fetchHistory = async () => {
    if (!selectedWorkspaceId) {
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);

    const { data, error: analysesError } = await supabase
      .from('analyses')
      .select('*')
      .eq('workspace_id', selectedWorkspaceId)
      .eq('research_type', researchType)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!analysesError && data) {
      // Fetch insights count for each analysis
      const analysesWithCounts = await Promise.all(
        data.map(async (analysis) => {
          const { count } = await supabase
            .from('insights')
            .select('*', { count: 'exact', head: true })
            .eq('analysis_id', analysis.id);

          return {
            ...analysis,
            insights_count: count || 0,
          };
        })
      );

      setCsvAnalyses(analysesWithCounts);
    }

    setHistoryLoading(false);
  };

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    // Read file
    const text = await selectedFile.text();
    setCsvData(text);

    // Generate preview (first 5 lines)
    const lines = text.split('\n').filter(l => l.trim()).slice(0, 6);
    setPreview(lines);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      handleFileSelect(droppedFile);
    } else {
      setError('Please drop a CSV file');
    }
  };

  const handleAnalyze = async () => {
    if (!csvData || !selectedWorkspaceId) return;

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          researchType,
          csvData,
          fileName: file?.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data);

      // Refresh history
      await fetchHistory();

      // Redirect to results page after short delay
      setTimeout(() => {
        router.push(`/dashboard/results/${data.analysisId}`);
      }, 2000);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCsvData(null);
    setPreview([]);
    setError(null);
    setResult(null);
  };

  // Calculate stats
  const totalAnalyses = csvAnalyses.length;
  const totalInsights = csvAnalyses.reduce((sum, a) => sum + (a.insights_count || 0), 0);
  const totalRows = csvAnalyses.reduce((sum, a) => sum + (a.metrics?.total_rows || 0), 0);

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Left Sidebar - Upload Form */}
      <div className="lg:col-span-1">
        <div
          className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24"
          style={{
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <h2 className="text-lg font-black text-brand-black mb-6">{title}</h2>

          {/* Upload Area */}
          {!csvData ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-gold transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              <div className="w-12 h-12 mx-auto mb-3 bg-brand-gold/20 rounded-lg flex items-center justify-center">
                {icon}
              </div>

              <p className="text-sm font-bold text-brand-black mb-2">Choose CSV File</p>
              <p className="text-xs text-brand-text-tertiary">{description}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-black text-brand-black">{file?.name}</div>
                      <div className="text-xs text-brand-text-tertiary">
                        {((file?.size || 0) / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs font-bold text-brand-text-secondary hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* Preview */}
                {preview.length > 0 && (
                  <div>
                    <div className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Preview</div>
                    <div className="bg-white rounded border border-gray-200 p-2 overflow-x-auto max-h-32 overflow-y-auto">
                      <pre className="text-xs text-brand-text-secondary font-mono whitespace-pre">
                        {preview.join('\n')}
                        {preview.length >= 6 && '\n...'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-medium text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Success Result */}
              {result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-green-900 mb-1">Analysis Complete!</h3>
                      <p className="text-xs text-green-800 mb-2">
                        {result.metadata?.insightsGenerated || 0} insights from {result.metadata?.rowsAnalyzed || 0} responses
                      </p>
                      <p className="text-xs text-green-700">Redirecting to results...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!result && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full bg-black hover:bg-brand-gold disabled:bg-gray-200 disabled:cursor-not-allowed text-white hover:text-black font-black py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                  style={
                    !analyzing
                      ? {
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)',
                        }
                      : undefined
                  }
                >
                  {analyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Analyze & Generate Insights
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Content - History */}
      <div className="lg:col-span-2">
        {historyLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center"
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-brand-gold mx-auto mb-4" />
            <p className="text-sm text-brand-text-secondary font-medium">Loading history...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            {totalAnalyses > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-black text-brand-black mb-1">{totalAnalyses}</div>
                  <div className="text-xs font-bold text-brand-text-secondary">Analyses</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-black text-brand-black mb-1">{totalInsights}</div>
                  <div className="text-xs font-bold text-brand-text-secondary">Insights</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-lg p-4">
                  <div className="text-2xl font-black text-brand-black mb-1">{totalRows}</div>
                  <div className="text-xs font-bold text-brand-text-secondary">Rows Analyzed</div>
                </div>
              </div>
            )}

            {/* History List */}
            <div
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              style={{
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-black text-brand-black">Recent Analyses</h2>
              </div>

              {csvAnalyses.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-black text-brand-black mb-2">No Analyses Yet</h3>
                  <p className="text-sm text-brand-text-secondary mb-4">
                    Upload your first CSV file to get started
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {csvAnalyses.map((analysis) => (
                    <Link
                      key={analysis.id}
                      href={`/dashboard/results/${analysis.id}`}
                      className="block p-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black px-2 py-1 bg-purple-100 text-purple-700 rounded uppercase">
                              CSV
                            </span>
                            <h3 className="text-sm font-bold text-brand-black group-hover:text-brand-gold transition-colors">
                              {analysis.url}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-brand-text-tertiary">
                            <span>
                              <span className="font-bold">{analysis.insights_count || 0}</span> insights
                            </span>
                            <span>•</span>
                            <span>
                              <span className="font-bold">{analysis.metrics?.total_rows || 0}</span> rows
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(analysis.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
