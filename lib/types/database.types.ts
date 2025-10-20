// TypeScript types for Supabase database
// Generated manually - you can auto-generate with: npx supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analyses: {
        Row: {
          id: string
          user_id: string
          url: string
          metrics: AnalysisMetrics
          context: AnalysisContext
          llm: string | null
          summary: AnalysisSummary
          recommendations: Json | null
          above_the_fold: Json | null
          below_the_fold: Json | null
          full_page: Json | null
          strategic_extensions: Json | null
          roadmap: Json | null
          vision_analysis: Json | null
          screenshots: AnalysisScreenshots | null
          usage: AnalysisUsage | null
          status: 'completed' | 'failed' | 'processing'
          error_message: string | null
          progress: number | null
          progress_stage: string | null
          progress_message: string | null
          tags: string[]
          is_starred: boolean
          notes: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          metrics?: AnalysisMetrics
          context?: AnalysisContext
          llm?: string | null
          summary?: AnalysisSummary
          recommendations?: Json | null
          above_the_fold?: Json | null
          below_the_fold?: Json | null
          full_page?: Json | null
          strategic_extensions?: Json | null
          roadmap?: Json | null
          vision_analysis?: Json | null
          screenshots?: AnalysisScreenshots | null
          usage?: AnalysisUsage | null
          status?: 'completed' | 'failed' | 'processing'
          error_message?: string | null
          progress?: number | null
          progress_stage?: string | null
          progress_message?: string | null
          tags?: string[]
          is_starred?: boolean
          notes?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          metrics?: AnalysisMetrics
          context?: AnalysisContext
          llm?: string | null
          summary?: AnalysisSummary
          recommendations?: Json | null
          above_the_fold?: Json | null
          below_the_fold?: Json | null
          full_page?: Json | null
          strategic_extensions?: Json | null
          roadmap?: Json | null
          vision_analysis?: Json | null
          screenshots?: AnalysisScreenshots | null
          usage?: AnalysisUsage | null
          status?: 'completed' | 'failed' | 'processing'
          error_message?: string | null
          progress?: number | null
          progress_stage?: string | null
          progress_message?: string | null
          tags?: string[]
          is_starred?: boolean
          notes?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Custom types for JSONB fields
export interface AnalysisMetrics {
  visitors: string
  addToCarts: string
  purchases: string
  aov: string
}

export interface AnalysisContext {
  trafficSource: string
  productType: string
  pricePoint: string
}

export interface AnalysisSummary {
  headline: string
  diagnosticTone: 'direct' | 'optimistic' | 'urgent'
  confidence: 'low' | 'medium' | 'high'
  heuristics?: {
    clarity: number
    trust: number
    urgency: number
    friction: number
  }
}

export interface AnalysisScreenshots {
  desktopAboveFold?: string
  desktopFullPage?: string
  mobileAboveFold?: string
  mobileFullPage?: string
}

export interface AnalysisUsage {
  visionInputTokens?: number
  visionOutputTokens?: number
  analysisInputTokens?: number
  analysisOutputTokens?: number
  totalTokens?: number
  estimatedCost?: number
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Analysis = Database['public']['Tables']['analyses']['Row']
export type InsertProfile = Database['public']['Tables']['profiles']['Insert']
export type InsertAnalysis = Database['public']['Tables']['analyses']['Insert']
export type UpdateProfile = Database['public']['Tables']['profiles']['Update']
export type UpdateAnalysis = Database['public']['Tables']['analyses']['Update']
