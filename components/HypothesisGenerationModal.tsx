'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Theme, Insight } from '@/lib/types/insights.types';

interface HypothesisGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
}

interface Experiment {
  id: string;
  experiment_id: string;
  name: string;
  status: string;
  results_summary?: any;
}

export function HypothesisGenerationModal({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
}: HypothesisGenerationModalProps) {
  const supabase = createClientComponentClient();

  // Data
  const [themes, setThemes] = useState<Theme[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selections
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [selectedInsightIds, setSelectedInsightIds] = useState<string[]>([]);
  const [selectedExperimentIds, setSelectedExperimentIds] = useState<string[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'themes' | 'insights' | 'experiments'>('themes');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, workspaceId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch themes
      const { data: themesData } = await supabase
        .from('themes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .order('priority', { ascending: true })
        .limit(20);

      // Fetch insights
      const { data: insightsData } = await supabase
        .from('insights')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('status', ['draft', 'validated'])
        .order('priority', { ascending: true })
        .order('confidence_level', { ascending: false })
        .limit(30);

      // Fetch experiments
      const { data: experimentsData } = await supabase
        .from('experiments')
        .select('id, experiment_id, name, status, results_summary')
        .eq('workspace_id', workspaceId)
        .in('status', ['completed', 'concluded'])
        .order('created_at', { ascending: false })
        .limit(20);

      setThemes(themesData || []);
      setInsights(insightsData || []);
      setExperiments(experimentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    // Validation
    const totalSelected = selectedThemeIds.length + selectedInsightIds.length + selectedExperimentIds.length;
    if (totalSelected === 0) {
      alert('Please select at least one theme, insight, or experiment');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/hypotheses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          themeIds: selectedThemeIds.length > 0 ? selectedThemeIds : undefined,
          insightIds: selectedInsightIds.length > 0 ? selectedInsightIds : undefined,
          experimentIds: selectedExperimentIds.length > 0 ? selectedExperimentIds : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
        // Reset selections
        setSelectedThemeIds([]);
        setSelectedInsightIds([]);
        setSelectedExperimentIds([]);
      } else {
        alert(result.error || 'Failed to generate hypotheses');
      }
    } catch (error) {
      console.error('Error generating hypotheses:', error);
      alert('Failed to generate hypotheses. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleTheme = (themeId: string) => {
    setSelectedThemeIds(prev =>
      prev.includes(themeId)
        ? prev.filter(id => id !== themeId)
        : [...prev, themeId]
    );
  };

  const toggleInsight = (insightId: string) => {
    setSelectedInsightIds(prev =>
      prev.includes(insightId)
        ? prev.filter(id => id !== insightId)
        : [...prev, insightId]
    );
  };

  const toggleExperiment = (experimentId: string) => {
    setSelectedExperimentIds(prev =>
      prev.includes(experimentId)
        ? prev.filter(id => id !== experimentId)
        : [...prev, experimentId]
    );
  };

  if (!isOpen) return null;

  const totalSelected = selectedThemeIds.length + selectedInsightIds.length + selectedExperimentIds.length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-brand-black">Generate Hypotheses</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={generating}
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-brand-text-secondary">
            Select themes, insights, or past experiments to generate up to 3 new hypotheses
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('themes')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'themes'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-600 hover:text-brand-black'
            }`}
          >
            Themes ({themes.length})
            {selectedThemeIds.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-brand-gold text-white text-xs rounded-full">
                {selectedThemeIds.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'insights'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-600 hover:text-brand-black'
            }`}
          >
            Insights ({insights.length})
            {selectedInsightIds.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-brand-gold text-white text-xs rounded-full">
                {selectedInsightIds.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('experiments')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'experiments'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-600 hover:text-brand-black'
            }`}
          >
            Past Experiments ({experiments.length})
            {selectedExperimentIds.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-brand-gold text-white text-xs rounded-full">
                {selectedExperimentIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-gold border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Themes Tab */}
              {activeTab === 'themes' && (
                <div className="space-y-3">
                  {themes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="font-medium mb-2">No themes available</p>
                      <p className="text-sm">Create themes from your insights first</p>
                    </div>
                  ) : (
                    themes.map(theme => (
                      <label
                        key={theme.id}
                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedThemeIds.includes(theme.theme_id)
                            ? 'border-brand-gold bg-brand-gold/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedThemeIds.includes(theme.theme_id)}
                            onChange={() => toggleTheme(theme.theme_id)}
                            className="mt-1 w-5 h-5 text-brand-gold rounded border-gray-300 focus:ring-brand-gold"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-gray-500">{theme.theme_id}</span>
                              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                theme.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                theme.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {theme.priority}
                              </span>
                            </div>
                            <div className="font-bold text-brand-black mb-1">{theme.title}</div>
                            <div className="text-sm text-gray-600 line-clamp-2">{theme.theme_statement}</div>
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}

              {/* Insights Tab */}
              {activeTab === 'insights' && (
                <div className="space-y-3">
                  {insights.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="font-medium mb-2">No insights available</p>
                      <p className="text-sm">Run research analysis to generate insights</p>
                    </div>
                  ) : (
                    insights.map(insight => (
                      <label
                        key={insight.id}
                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedInsightIds.includes(insight.insight_id)
                            ? 'border-brand-gold bg-brand-gold/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedInsightIds.includes(insight.insight_id)}
                            onChange={() => toggleInsight(insight.insight_id)}
                            className="mt-1 w-5 h-5 text-brand-gold rounded border-gray-300 focus:ring-brand-gold"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-gray-500">{insight.insight_id}</span>
                              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                insight.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                insight.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {insight.priority}
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                insight.confidence_level === 'high' ? 'bg-green-100 text-green-700' :
                                insight.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {insight.confidence_level} confidence
                              </span>
                            </div>
                            {insight.title && (
                              <div className="font-bold text-brand-black mb-1">{insight.title}</div>
                            )}
                            <div className="text-sm text-gray-600 line-clamp-2">{insight.statement}</div>
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}

              {/* Experiments Tab */}
              {activeTab === 'experiments' && (
                <div className="space-y-3">
                  {experiments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="font-medium mb-2">No completed experiments</p>
                      <p className="text-sm">Completed experiments can provide insights for new hypotheses</p>
                    </div>
                  ) : (
                    experiments.map(experiment => (
                      <label
                        key={experiment.id}
                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedExperimentIds.includes(experiment.experiment_id)
                            ? 'border-brand-gold bg-brand-gold/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedExperimentIds.includes(experiment.experiment_id)}
                            onChange={() => toggleExperiment(experiment.experiment_id)}
                            className="mt-1 w-5 h-5 text-brand-gold rounded border-gray-300 focus:ring-brand-gold"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-gray-500">{experiment.experiment_id}</span>
                              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                experiment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {experiment.status}
                              </span>
                            </div>
                            <div className="font-bold text-brand-black mb-1">{experiment.name}</div>
                            {experiment.results_summary && (
                              <div className="text-sm text-gray-600 line-clamp-2">
                                {typeof experiment.results_summary === 'string'
                                  ? experiment.results_summary
                                  : experiment.results_summary.summary || 'See results'}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-bold text-brand-black">{totalSelected}</span> selected
              {totalSelected > 0 && <span className="ml-2">→ Will generate up to 3 hypotheses</span>}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={generating}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || totalSelected === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Hypotheses
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
