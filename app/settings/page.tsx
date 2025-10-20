'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (error || !currentUser) {
        router.replace('/login');
        return;
      }

      setUser(currentUser);
      setLoading(false);
    };

    checkAuth();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-brand-black mb-2">Settings</h1>
          <p className="text-sm text-brand-text-secondary font-medium">
            Manage your account preferences and settings
          </p>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Account Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-black text-brand-black mb-4">Account Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-text-secondary mb-2">
                  Email
                </label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-brand-black">
                  {user.email}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-text-secondary mb-2">
                  User ID
                </label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-brand-text-tertiary">
                  {user.id}
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-black text-brand-black mb-4">Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <div className="text-sm font-bold text-brand-black">Default LLM Provider</div>
                  <div className="text-xs text-brand-text-tertiary mt-1">Choose your preferred AI model</div>
                </div>
                <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-brand-gold transition-all bg-white">
                  <option value="gpt">GPT-4</option>
                  <option value="claude">Claude 3.5</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-bold text-brand-black">Email Notifications</div>
                  <div className="text-xs text-brand-text-tertiary mt-1">Receive analysis completion emails</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-gold rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-gold"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Coming Soon Section */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-8 text-center opacity-60">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-brand-black mb-2">More Settings Coming Soon</h3>
              <p className="text-sm text-brand-text-secondary">
                API integrations, team management, billing, and more
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
