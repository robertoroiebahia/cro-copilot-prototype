/**
 * Progress Tracker Utility
 * Provides granular progress tracking for analysis pipeline
 */

import { createClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ProgressStage =
  | 'initializing'
  | 'scraping'
  | 'processing-html'
  | 'capturing-screenshot'
  | 'running-ai-analysis'
  | 'saving-results'
  | 'completed'
  | 'failed';

export interface ProgressUpdate {
  stage: ProgressStage;
  progress: number; // 0-100
  message: string;
  details?: string;
}

/**
 * Progress Tracker for a single analysis
 */
export class ProgressTracker {
  private analysisId: string;
  private supabase: SupabaseClient;
  private currentProgress: number = 0;
  private currentStage: ProgressStage = 'initializing';

  constructor(analysisId: string, supabase?: SupabaseClient) {
    this.analysisId = analysisId;
    this.supabase = supabase || createClient();
  }

  /**
   * Update progress in database
   */
  async update(update: Partial<ProgressUpdate>): Promise<void> {
    if (update.progress !== undefined) {
      this.currentProgress = update.progress;
    }
    if (update.stage !== undefined) {
      this.currentStage = update.stage;
    }

    const progressData = {
      progress: this.currentProgress,
      progress_stage: this.currentStage,
      progress_message: update.message || this.getDefaultMessage(this.currentStage),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await this.supabase
        .from('analyses')
        .update(progressData)
        .eq('id', this.analysisId);

      if (error) {
        console.error('Failed to update progress:', error);
      }
    } catch (err) {
      console.error('Progress update error:', err);
    }
  }

  /**
   * Mark stage as started
   */
  async startStage(stage: ProgressStage, message?: string): Promise<void> {
    const progress = this.getStageProgress(stage);
    await this.update({
      stage,
      progress,
      message: message || this.getDefaultMessage(stage),
    });
  }

  /**
   * Mark stage as completed
   */
  async completeStage(stage: ProgressStage, message?: string): Promise<void> {
    const progress = this.getStageProgress(stage) + 10; // +10% for completion
    await this.update({
      stage,
      progress,
      message: message || this.getDefaultMessage(stage) + ' ✓',
    });
  }

  /**
   * Mark entire analysis as failed
   */
  async markFailed(errorMessage: string): Promise<void> {
    await this.update({
      stage: 'failed',
      progress: this.currentProgress,
      message: errorMessage,
    });

    // Also update status field
    try {
      await this.supabase
        .from('analyses')
        .update({
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', this.analysisId);
    } catch (err) {
      console.error('Failed to mark analysis as failed:', err);
    }
  }

  /**
   * Mark entire analysis as completed
   */
  async markCompleted(): Promise<void> {
    await this.update({
      stage: 'completed',
      progress: 100,
      message: 'Analysis complete!',
    });
  }

  /**
   * Get progress percentage for a given stage
   */
  private getStageProgress(stage: ProgressStage): number {
    const stageMap: Record<ProgressStage, number> = {
      'initializing': 0,
      'scraping': 10,
      'processing-html': 25,
      'capturing-screenshot': 35,
      'running-ai-analysis': 50,
      'saving-results': 90,
      'completed': 100,
      'failed': 0,
    };
    return stageMap[stage] || 0;
  }

  /**
   * Get default message for a stage
   */
  private getDefaultMessage(stage: ProgressStage): string {
    const messageMap: Record<ProgressStage, string> = {
      'initializing': 'Starting analysis...',
      'scraping': 'Fetching page content with Firecrawl...',
      'processing-html': 'Processing page structure...',
      'capturing-screenshot': 'Capturing mobile screenshot...',
      'running-ai-analysis': 'Running AI analysis (this may take 30-60 seconds)...',
      'saving-results': 'Saving recommendations...',
      'completed': 'Analysis complete!',
      'failed': 'Analysis failed',
    };
    return messageMap[stage] || 'Processing...';
  }

  /**
   * Convenience method to track AI analysis progress
   * GPT/Claude analysis takes the longest, so we provide granular updates
   */
  async updateAIProgress(percentage: number, detail?: string): Promise<void> {
    // AI analysis is 50-90% of total progress
    const aiBaseProgress = 50;
    const aiProgressRange = 40;
    const totalProgress = aiBaseProgress + (percentage / 100) * aiProgressRange;

    await this.update({
      stage: 'running-ai-analysis',
      progress: Math.min(90, Math.round(totalProgress)),
      message: detail || `Running AI analysis (${Math.round(percentage)}%)...`,
    });
  }
}

/**
 * Create a new analysis record with initial progress
 */
export async function initializeAnalysisWithProgress(
  analysisId: string,
  userId: string,
  url: string,
  supabase?: SupabaseClient
): Promise<void> {
  const client = supabase || createClient();

  const { error } = await client
    .from('analyses')
    .insert({
      id: analysisId,
      user_id: userId,
      url,
      status: 'processing',
      progress: 0,
      progress_stage: 'initializing',
      progress_message: 'Starting analysis...',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to initialize analysis:', error);
    throw new Error('Failed to initialize analysis');
  }
}
