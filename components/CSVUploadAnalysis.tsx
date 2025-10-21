'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from './WorkspaceContext';

type ResearchType = 'survey_analysis' | 'onsite_poll' | 'review_mining';

interface CSVUploadAnalysisProps {
  researchType: ResearchType;
  title: string;
  description: string;
  icon: React.ReactNode;
  acceptedFormats?: string[];
}

export function CSVUploadAnalysis({
  researchType,
  title,
  description,
  icon,
  acceptedFormats = ['.csv'],
}: CSVUploadAnalysisProps) {
  const router = useRouter();
  const { selectedWorkspaceId } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Upload Area */}
      {!csvData ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-brand-gold transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <div className="w-16 h-16 mx-auto mb-4 bg-brand-gold/20 rounded-lg flex items-center justify-center">
            {icon}
          </div>

          <h3 className="text-lg font-black text-brand-black mb-2">{title}</h3>
          <p className="text-sm text-brand-text-secondary mb-6">{description}</p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-6 py-3 bg-brand-gold hover:bg-black text-brand-black hover:text-white font-black rounded-lg transition-all duration-300"
          >
            Choose CSV File
          </button>

          <p className="text-xs text-brand-text-tertiary mt-4">
            or drag and drop your CSV file here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-brand-black">{file?.name}</div>
                  <div className="text-xs text-brand-text-tertiary">
                    {(file?.size || 0 / 1024).toFixed(2)} KB
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setCsvData(null);
                  setPreview([]);
                  setError(null);
                }}
                className="text-sm font-bold text-brand-text-secondary hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div>
                <div className="text-xs font-black text-brand-text-tertiary uppercase mb-2">Preview</div>
                <div className="bg-gray-50 rounded border border-gray-200 p-3 overflow-x-auto">
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-green-900 mb-2">Analysis Complete!</h3>
                  <p className="text-sm text-green-800 mb-4">
                    Generated {result.metadata?.insightsGenerated || 0} insights from {result.metadata?.rowsAnalyzed || 0} responses
                  </p>
                  <p className="text-xs text-green-700">
                    Redirecting to results page...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!result && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 px-6 py-3 bg-brand-gold hover:bg-black text-brand-black hover:text-white font-black rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
