'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useWorkspace } from './WorkspaceContext';

interface TooltipStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const ANALYSIS_GUIDE_STEPS: TooltipStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your First Analysis!',
    description: 'Let\'s walk through how to analyze a landing page and get AI-powered insights.',
  },
  {
    id: 'url-input',
    title: 'Enter a URL',
    description: 'Start by entering the URL of a landing page you want to optimize. This could be your homepage, product page, or any page you want to improve.',
  },
  {
    id: 'metrics',
    title: 'Add Context (Optional)',
    description: 'Providing metrics like conversion rates and traffic sources helps the AI give more targeted recommendations.',
  },
  {
    id: 'analyze',
    title: 'Run Analysis',
    description: 'Click "Analyze Page" and our AI will examine your page, take screenshots, and generate detailed insights in about 2-3 minutes.',
  },
];

interface FirstAnalysisGuideProps {
  onComplete?: () => void;
}

export default function FirstAnalysisGuide({ onComplete }: FirstAnalysisGuideProps) {
  const { user } = useAuth();
  const { selectedWorkspaceId } = useWorkspace();
  const supabase = createClient();

  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIfFirstAnalysis();
  }, [user, selectedWorkspaceId]);

  const checkIfFirstAnalysis = async () => {
    if (!user || !selectedWorkspaceId) {
      setLoading(false);
      return;
    }

    try {
      // Check if user has any analyses
      const { data: analyses, error } = await supabase
        .from('analyses')
        .select('id')
        .eq('workspace_id', selectedWorkspaceId)
        .limit(1);

      if (error) throw error;

      // Show guide if no analyses exist
      const isFirstAnalysis = !analyses || analyses.length === 0;
      setShowGuide(isFirstAnalysis);
    } catch (error) {
      console.error('Error checking first analysis status:', error);
      setShowGuide(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < ANALYSIS_GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    setShowGuide(false);
    onComplete?.();
  };

  const handleComplete = () => {
    setShowGuide(false);
    onComplete?.();
  };

  if (loading || !showGuide) {
    return null;
  }

  const step = ANALYSIS_GUIDE_STEPS[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-300" />

      {/* Guide Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in duration-300">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full mx-4">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-6">
            {ANALYSIS_GUIDE_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  index <= currentStep ? 'bg-brand-gold' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center mb-4">
            {currentStep === 0 && (
              <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {currentStep === 1 && (
              <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            )}
            {currentStep === 2 && (
              <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
            {currentStep === 3 && (
              <svg className="w-7 h-7 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            )}
          </div>

          {/* Content */}
          <h2 className="text-2xl font-black text-gray-900 mb-3">
            {step.title}
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Skip Tutorial
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold rounded-xl shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              {currentStep < ANALYSIS_GUIDE_STEPS.length - 1 ? 'Next' : 'Get Started'}
            </button>
          </div>

          {/* Step Counter */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Step {currentStep + 1} of {ANALYSIS_GUIDE_STEPS.length}
          </p>
        </div>
      </div>
    </>
  );
}
