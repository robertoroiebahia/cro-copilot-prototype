/**
 * Database Types for Insights System
 * Extended database schema for insights, themes, hypotheses, and experiments
 */

import { Json } from './database.types';

// Extend the Database interface with new tables
export interface InsightsDatabase {
  public: {
    Tables: {
      insights: {
        Row: {
          id: string;
          analysis_id: string;
          user_id: string;
          type: 'observation' | 'problem' | 'opportunity' | 'risk';
          category: 'ux' | 'messaging' | 'trust' | 'urgency' | 'value_prop' | 'friction' | 'conversion' | 'engagement';
          title: string;
          description: string;
          evidence: Json;
          severity: 'low' | 'medium' | 'high' | 'critical';
          confidence: number; // 0-100
          impact_score: number; // 0-100
          effort_estimate: 'trivial' | 'small' | 'medium' | 'large' | 'xlarge';
          location: {
            section: string;
            selector?: string;
            coordinates?: { x: number; y: number };
          };
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          user_id: string;
          type: 'observation' | 'problem' | 'opportunity' | 'risk';
          category: 'ux' | 'messaging' | 'trust' | 'urgency' | 'value_prop' | 'friction' | 'conversion' | 'engagement';
          title: string;
          description: string;
          evidence?: Json;
          severity: 'low' | 'medium' | 'high' | 'critical';
          confidence?: number;
          impact_score?: number;
          effort_estimate?: 'trivial' | 'small' | 'medium' | 'large' | 'xlarge';
          location: {
            section: string;
            selector?: string;
            coordinates?: { x: number; y: number };
          };
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          analysis_id?: string;
          user_id?: string;
          type?: 'observation' | 'problem' | 'opportunity' | 'risk';
          category?: 'ux' | 'messaging' | 'trust' | 'urgency' | 'value_prop' | 'friction' | 'conversion' | 'engagement';
          title?: string;
          description?: string;
          evidence?: Json;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          confidence?: number;
          impact_score?: number;
          effort_estimate?: 'trivial' | 'small' | 'medium' | 'large' | 'xlarge';
          location?: {
            section: string;
            selector?: string;
            coordinates?: { x: number; y: number };
          };
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      themes: {
        Row: {
          id: string;
          analysis_id: string;
          user_id: string;
          name: string;
          description: string;
          insight_ids: string[];
          pattern_type: 'recurring' | 'systemic' | 'behavioral' | 'technical';
          priority: number; // 1-10
          business_impact: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          user_id: string;
          name: string;
          description: string;
          insight_ids?: string[];
          pattern_type: 'recurring' | 'systemic' | 'behavioral' | 'technical';
          priority?: number;
          business_impact?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          analysis_id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          insight_ids?: string[];
          pattern_type?: 'recurring' | 'systemic' | 'behavioral' | 'technical';
          priority?: number;
          business_impact?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      hypotheses: {
        Row: {
          id: string;
          theme_id: string;
          analysis_id: string;
          user_id: string;
          hypothesis: string;
          rationale: string;
          expected_outcome: string;
          success_metrics: Json;
          status: 'draft' | 'active' | 'validated' | 'invalidated' | 'archived';
          confidence_level: number; // 0-100
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          theme_id: string;
          analysis_id: string;
          user_id: string;
          hypothesis: string;
          rationale: string;
          expected_outcome: string;
          success_metrics?: Json;
          status?: 'draft' | 'active' | 'validated' | 'invalidated' | 'archived';
          confidence_level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          theme_id?: string;
          analysis_id?: string;
          user_id?: string;
          hypothesis?: string;
          rationale?: string;
          expected_outcome?: string;
          success_metrics?: Json;
          status?: 'draft' | 'active' | 'validated' | 'invalidated' | 'archived';
          confidence_level?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      experiments: {
        Row: {
          id: string;
          hypothesis_id: string;
          analysis_id: string;
          user_id: string;
          name: string;
          description: string;
          variant_a: Json; // Control
          variant_b: Json; // Treatment
          implementation_plan: Json;
          success_criteria: Json;
          status: 'planned' | 'running' | 'completed' | 'cancelled';
          results: Json | null;
          conclusion: string | null;
          created_at: string;
          updated_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          hypothesis_id: string;
          analysis_id: string;
          user_id: string;
          name: string;
          description: string;
          variant_a: Json;
          variant_b: Json;
          implementation_plan?: Json;
          success_criteria?: Json;
          status?: 'planned' | 'running' | 'completed' | 'cancelled';
          results?: Json | null;
          conclusion?: string | null;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          hypothesis_id?: string;
          analysis_id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          variant_a?: Json;
          variant_b?: Json;
          implementation_plan?: Json;
          success_criteria?: Json;
          status?: 'planned' | 'running' | 'completed' | 'cancelled';
          results?: Json | null;
          conclusion?: string | null;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
    };
  };
}

// Helper types
export type Insight = InsightsDatabase['public']['Tables']['insights']['Row'];
export type InsertInsight = InsightsDatabase['public']['Tables']['insights']['Insert'];
export type UpdateInsight = InsightsDatabase['public']['Tables']['insights']['Update'];

export type Theme = InsightsDatabase['public']['Tables']['themes']['Row'];
export type InsertTheme = InsightsDatabase['public']['Tables']['themes']['Insert'];
export type UpdateTheme = InsightsDatabase['public']['Tables']['themes']['Update'];

export type Hypothesis = InsightsDatabase['public']['Tables']['hypotheses']['Row'];
export type InsertHypothesis = InsightsDatabase['public']['Tables']['hypotheses']['Insert'];
export type UpdateHypothesis = InsightsDatabase['public']['Tables']['hypotheses']['Update'];

export type Experiment = InsightsDatabase['public']['Tables']['experiments']['Row'];
export type InsertExperiment = InsightsDatabase['public']['Tables']['experiments']['Insert'];
export type UpdateExperiment = InsightsDatabase['public']['Tables']['experiments']['Update'];
