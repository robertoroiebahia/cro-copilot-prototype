/**
 * Analysis Repository
 * Handles all database operations for analyses
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { InsertAnalysis } from '@/lib/types/database.types';

export class AnalysisRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a new analysis record
   */
  async create(analysisData: InsertAnalysis): Promise<{ id: string } | null> {
    const { data, error } = await this.supabase
      .from('analyses')
      .insert(analysisData)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save analysis:', error);
      throw new Error(`Failed to save analysis: ${error.message}`);
    }

    return data;
  }

  /**
   * Gets an analysis by ID
   */
  async getById(id: string, userId: string) {
    const { data, error } = await this.supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch analysis:', error);
      return null;
    }

    return data;
  }

  /**
   * Lists all analyses for a user
   */
  async listByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('analyses')
      .select('id, user_id, url, status, summary, usage, llm, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch analyses:', error);
      throw new Error(`Failed to fetch analyses: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Updates an analysis status
   */
  async updateStatus(id: string, userId: string, status: 'processing' | 'completed' | 'failed') {
    const { error } = await this.supabase
      .from('analyses')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update analysis status:', error);
      throw new Error(`Failed to update analysis status: ${error.message}`);
    }
  }

  /**
   * Deletes an analysis
   */
  async delete(id: string, userId: string) {
    const { error } = await this.supabase
      .from('analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete analysis:', error);
      throw new Error(`Failed to delete analysis: ${error.message}`);
    }
  }
}
