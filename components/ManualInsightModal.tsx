'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type {
  ResearchType,
  InsightStatus,
  JourneyStage,
  DeviceType,
  GrowthPillar,
  Priority,
  FrictionType,
  PsychologyPrinciple,
  ValidationStatus
} from '@/lib/types/insights.types';
import { RESEARCH_TYPE_LABELS } from '@/lib/types/insights.types';
import { useWorkspace } from './WorkspaceContext';

interface ManualInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualInsightModal({ isOpen, onClose, onSuccess }: ManualInsightModalProps) {
  const supabase = createClient();
  const { selectedWorkspaceId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'context' | 'impact' | 'evidence'>('basic');

  // Basic Info
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [researchType, setResearchType] = useState<ResearchType>('page_analysis');
  const [status, setStatus] = useState<InsightStatus>('draft');

  // Context
  const [customerSegment, setCustomerSegment] = useState('');
  const [journeyStage, setJourneyStage] = useState<JourneyStage | ''>('');
  const [pageLocations, setPageLocations] = useState<string[]>([]);
  const [deviceType, setDeviceType] = useState<DeviceType | ''>('');

  // Business Impact
  const [growthPillar, setGrowthPillar] = useState<GrowthPillar>('conversion');
  const [affectedKpis, setAffectedKpis] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('medium');
  const [currentPerformance, setCurrentPerformance] = useState('');

  // Categorization
  const [tags, setTags] = useState<string[]>([]);
  const [frictionType, setFrictionType] = useState<FrictionType | ''>('');
  const [psychologyPrinciple, setPsychologyPrinciple] = useState<PsychologyPrinciple | ''>('');

  // Evidence
  const [hasQuantitative, setHasQuantitative] = useState(false);
  const [quantMetric, setQuantMetric] = useState('');
  const [quantValue, setQuantValue] = useState('');
  const [quantSampleSize, setQuantSampleSize] = useState('');
  const [hasQualitative, setHasQualitative] = useState(false);
  const [qualitativeQuotes, setQualitativeQuotes] = useState<string[]>(['']);
  const [qualitativeSources, setQualitativeSources] = useState<string[]>(['']);

  // Validation
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('untested');
  const [sourceUrl, setSourceUrl] = useState('');
  const [suggestedActions, setSuggestedActions] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low'>('medium');

  const resetForm = () => {
    setTitle('');
    setStatement('');
    setResearchType('page_analysis');
    setStatus('draft');
    setCustomerSegment('');
    setJourneyStage('');
    setPageLocations([]);
    setDeviceType('');
    setGrowthPillar('conversion');
    setAffectedKpis([]);
    setPriority('medium');
    setCurrentPerformance('');
    setTags([]);
    setFrictionType('');
    setPsychologyPrinciple('');
    setHasQuantitative(false);
    setQuantMetric('');
    setQuantValue('');
    setQuantSampleSize('');
    setHasQualitative(false);
    setQualitativeQuotes(['']);
    setQualitativeSources(['']);
    setValidationStatus('untested');
    setSourceUrl('');
    setSuggestedActions('');
    setConfidenceLevel('medium');
    setError(null);
    setActiveTab('basic');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to create insights');
        return;
      }

      if (!selectedWorkspaceId) {
        setError('No workspace selected. Please select a workspace first.');
        return;
      }

      // Build evidence object
      const evidence: any = {};
      if (hasQuantitative && quantMetric && quantValue) {
        evidence.quantitative = {
          metric: quantMetric,
          value: quantValue,
          ...(quantSampleSize && { sample_size: parseInt(quantSampleSize) })
        };
      }
      if (hasQualitative) {
        const quotes = qualitativeQuotes.filter(q => q.trim());
        const sources = qualitativeSources.filter(s => s.trim());
        if (quotes.length > 0 || sources.length > 0) {
          evidence.qualitative = {
            ...(quotes.length > 0 && { quotes }),
            ...(sources.length > 0 && { sources })
          };
        }
      }

      // Build sources object (required by schema)
      const sources = {
        primary: {
          type: 'user_testing' as const,
          name: 'Manual Entry',
          date: new Date().toISOString().split('T')[0]
        }
      };

      // Generate insight ID
      const insightId = `INS-${Date.now().toString().slice(-6)}`;

      const insightData = {
        // Core identification
        insight_id: insightId,
        title,
        status,
        workspace_id: selectedWorkspaceId,

        // Analysis connection
        research_type: researchType,
        source_type: 'manual',
        ...(sourceUrl && { source_url: sourceUrl }),

        // Content
        statement,

        // Context
        ...(customerSegment && { customer_segment: customerSegment }),
        ...(journeyStage && { journey_stage: journeyStage }),
        ...(pageLocations.length > 0 && { page_location: pageLocations }),
        ...(deviceType && { device_type: deviceType }),

        // Evidence
        evidence,
        sources,

        // Business impact
        growth_pillar: growthPillar,
        ...(affectedKpis.length > 0 && { affected_kpis: affectedKpis }),
        ...(currentPerformance && { current_performance: currentPerformance }),

        // Assessment
        confidence_level: confidenceLevel,
        priority,
        validation_status: validationStatus,

        // Categorization
        ...(tags.length > 0 && { tags }),
        ...(frictionType && { friction_type: frictionType }),
        ...(psychologyPrinciple && { psychology_principle: psychologyPrinciple }),

        // Actions
        ...(suggestedActions && { suggested_actions: suggestedActions }),

        // Metadata
        created_by: user.id,
      };

      const { error: insertError } = await supabase
        .from('insights')
        .insert(insightData);

      if (insertError) throw insertError;

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating insight:', err);
      setError(err.message || 'Failed to create insight');
    } finally {
      setLoading(false);
    }
  };

  const addQuote = () => setQualitativeQuotes([...qualitativeQuotes, '']);
  const addSource = () => setQualitativeSources([...qualitativeSources, '']);
  const removeQuote = (index: number) => setQualitativeQuotes(qualitativeQuotes.filter((_, i) => i !== index));
  const removeSource = (index: number) => setQualitativeSources(qualitativeSources.filter((_, i) => i !== index));

  const togglePageLocation = (location: string) => {
    setPageLocations(prev =>
      prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]
    );
  };

  const toggleKpi = (kpi: string) => {
    setAffectedKpis(prev =>
      prev.includes(kpi) ? prev.filter(k => k !== kpi) : [...prev, kpi]
    );
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'context', label: 'Context', icon: '🎯' },
    { id: 'impact', label: 'Impact', icon: '📊' },
    { id: 'evidence', label: 'Evidence', icon: '🔍' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-gold rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-brand-black">Add Manual Insight</h2>
                <p className="text-xs text-brand-text-secondary">Create a research-backed insight</p>
              </div>
            </div>
            <button
              onClick={() => { resetForm(); onClose(); }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-brand-gold text-black'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short descriptive title (max 100 chars)"
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Insight Statement *
                </label>
                <textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="[Segment] + [Observation] + [Evidence]"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2">
                    Research Type *
                  </label>
                  <select
                    value={researchType}
                    onChange={(e) => setResearchType(e.target.value as ResearchType)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                    required
                  >
                    {(Object.keys(RESEARCH_TYPE_LABELS) as ResearchType[]).map((type) => (
                      <option key={type} value={type}>
                        {RESEARCH_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2">
                    Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as InsightStatus)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                    required
                  >
                    <option value="draft">Draft</option>
                    <option value="validated">Validated</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Source URL
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://link-to-research-doc.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                />
              </div>
            </div>
          )}

          {/* Context Tab */}
          {activeTab === 'context' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Customer Segment
                </label>
                <input
                  type="text"
                  value={customerSegment}
                  onChange={(e) => setCustomerSegment(e.target.value)}
                  placeholder="e.g., First-time buyers, Mobile users"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2">
                    Journey Stage
                  </label>
                  <select
                    value={journeyStage}
                    onChange={(e) => setJourneyStage(e.target.value as JourneyStage)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                  >
                    <option value="">None</option>
                    <option value="awareness">Awareness</option>
                    <option value="consideration">Consideration</option>
                    <option value="decision">Decision</option>
                    <option value="post_purchase">Post-Purchase</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2">
                    Device Type
                  </label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                  >
                    <option value="">None</option>
                    <option value="mobile">Mobile</option>
                    <option value="desktop">Desktop</option>
                    <option value="tablet">Tablet</option>
                    <option value="all">All Devices</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Page Location
                </label>
                <div className="flex flex-wrap gap-2">
                  {['homepage', 'pdp', 'cart', 'checkout', 'plp'].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => togglePageLocation(loc)}
                      className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                        pageLocations.includes(loc)
                          ? 'bg-brand-gold text-black'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {loc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Psychology Principle
                </label>
                <select
                  value={psychologyPrinciple}
                  onChange={(e) => setPsychologyPrinciple(e.target.value as PsychologyPrinciple)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                >
                  <option value="">None</option>
                  <option value="loss_aversion">Loss Aversion</option>
                  <option value="social_proof">Social Proof</option>
                  <option value="scarcity">Scarcity</option>
                  <option value="authority">Authority</option>
                  <option value="anchoring">Anchoring</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Friction Type
                </label>
                <select
                  value={frictionType}
                  onChange={(e) => setFrictionType(e.target.value as FrictionType)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                >
                  <option value="">None</option>
                  <option value="usability">Usability</option>
                  <option value="trust">Trust</option>
                  <option value="value_perception">Value Perception</option>
                  <option value="information_gap">Information Gap</option>
                  <option value="cognitive_load">Cognitive Load</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-full flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type and press Enter to add tags"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Impact Tab */}
          {activeTab === 'impact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2">
                    Growth Pillar *
                  </label>
                  <select
                    value={growthPillar}
                    onChange={(e) => setGrowthPillar(e.target.value as GrowthPillar)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                    required
                  >
                    <option value="conversion">Conversion</option>
                    <option value="aov">Average Order Value</option>
                    <option value="frequency">Purchase Frequency</option>
                    <option value="retention">Customer Retention</option>
                    <option value="acquisition">Customer Acquisition</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-brand-black mb-2">
                    Priority *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                    required
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Confidence Level *
                </label>
                <select
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(e.target.value as 'high' | 'medium' | 'low')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                  required
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Affected KPIs
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Mobile ATC Rate', 'CVR', 'Bounce Rate', 'AOV', 'Time on Page'].map((kpi) => (
                    <button
                      key={kpi}
                      type="button"
                      onClick={() => toggleKpi(kpi)}
                      className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                        affectedKpis.includes(kpi)
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {kpi}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Current Performance
                </label>
                <input
                  type="text"
                  value={currentPerformance}
                  onChange={(e) => setCurrentPerformance(e.target.value)}
                  placeholder="e.g., Mobile ATC: 8.92%"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Validation Status *
                </label>
                <select
                  value={validationStatus}
                  onChange={(e) => setValidationStatus(e.target.value as ValidationStatus)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium"
                  required
                >
                  <option value="untested">Untested</option>
                  <option value="testing">Testing</option>
                  <option value="validated">Validated</option>
                  <option value="invalidated">Invalidated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black mb-2">
                  Suggested Actions
                </label>
                <textarea
                  value={suggestedActions}
                  onChange={(e) => setSuggestedActions(e.target.value)}
                  placeholder="Initial ideas and recommendations..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold transition-all text-sm font-medium resize-none"
                />
              </div>
            </div>
          )}

          {/* Evidence Tab */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              {/* Quantitative Evidence */}
              <div>
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasQuantitative}
                    onChange={(e) => setHasQuantitative(e.target.checked)}
                    className="w-4 h-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                  />
                  <span className="text-sm font-bold text-brand-black">Add Quantitative Evidence</span>
                </label>
                {hasQuantitative && (
                  <div className="ml-6 space-y-3 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={quantMetric}
                        onChange={(e) => setQuantMetric(e.target.value)}
                        placeholder="Metric (e.g., Bounce Rate)"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                      />
                      <input
                        type="text"
                        value={quantValue}
                        onChange={(e) => setQuantValue(e.target.value)}
                        placeholder="Value (e.g., 45%)"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                      />
                    </div>
                    <input
                      type="number"
                      value={quantSampleSize}
                      onChange={(e) => setQuantSampleSize(e.target.value)}
                      placeholder="Sample Size (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Qualitative Evidence */}
              <div>
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasQualitative}
                    onChange={(e) => setHasQualitative(e.target.checked)}
                    className="w-4 h-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                  />
                  <span className="text-sm font-bold text-brand-black">Add Qualitative Evidence</span>
                </label>
                {hasQualitative && (
                  <div className="ml-6 space-y-3 bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-purple-900">Quotes</label>
                        <button
                          type="button"
                          onClick={addQuote}
                          className="text-xs font-bold text-purple-700 hover:text-purple-900"
                        >
                          + Add Quote
                        </button>
                      </div>
                      {qualitativeQuotes.map((quote, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={quote}
                            onChange={(e) => {
                              const newQuotes = [...qualitativeQuotes];
                              newQuotes[index] = e.target.value;
                              setQualitativeQuotes(newQuotes);
                            }}
                            placeholder="Customer quote..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                          />
                          {qualitativeQuotes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuote(index)}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-purple-900">Sources</label>
                        <button
                          type="button"
                          onClick={addSource}
                          className="text-xs font-bold text-purple-700 hover:text-purple-900"
                        >
                          + Add Source
                        </button>
                      </div>
                      {qualitativeSources.map((source, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={source}
                            onChange={(e) => {
                              const newSources = [...qualitativeSources];
                              newSources[index] = e.target.value;
                              setQualitativeSources(newSources);
                            }}
                            placeholder="Source (e.g., Survey, Interview)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                          />
                          {qualitativeSources.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSource(index)}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-200 mt-6">
            <p className="text-xs text-brand-text-tertiary">
              * Required fields | Tab: {activeTab}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { resetForm(); onClose(); }}
                className="px-6 py-3 border border-gray-300 text-brand-text-secondary font-bold rounded-lg hover:bg-gray-50 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title || !statement}
                className="px-6 py-3 bg-brand-gold hover:bg-black text-black hover:text-white font-black rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 4px 12px rgba(245, 197, 66, 0.3)'
                }}
              >
                {loading ? 'Creating...' : 'Create Insight'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
