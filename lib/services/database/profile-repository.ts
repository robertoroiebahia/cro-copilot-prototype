/**
 * Profile Repository
 * Handles all database operations for user profiles
 */

import { SupabaseClient } from '@supabase/supabase-js';

export class ProfileRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Gets a profile by user ID
   */
  async getById(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch profile:', error);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    return data;
  }

  /**
   * Creates a new profile for a user
   */
  async create(userId: string, email: string) {
    const { error } = await this.supabase
      .from('profiles')
      .insert({ id: userId, email });

    if (error) {
      console.error('Failed to create profile:', error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }
  }

  /**
   * Ensures a profile exists for a user, creating it if necessary
   */
  async ensureExists(userId: string, email: string): Promise<void> {
    const existing = await this.getById(userId);

    if (!existing) {
      await this.create(userId, email);
    }
  }
}
