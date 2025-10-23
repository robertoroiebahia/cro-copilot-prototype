'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import WorkspaceGuard from '@/components/WorkspaceGuard';
import { useRouter } from 'next/navigation';

function AccountContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useState(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    loadUser();
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-sm text-brand-text-secondary font-medium">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Info Card */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b-2 border-gray-200">
          <h3 className="text-lg font-black text-brand-black flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account Information
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1 block">
              Email Address
            </label>
            <div className="text-base font-bold text-brand-black">
              {user?.email || 'Not available'}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1 block">
              User ID
            </label>
            <div className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-200">
              {user?.id || 'Not available'}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1 block">
              Account Created
            </label>
            <div className="text-base font-bold text-brand-black">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              }) : 'Not available'}
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b-2 border-gray-200">
          <h3 className="text-lg font-black text-brand-black flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Security
          </h3>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-black text-gray-900 mb-1">Password Management</h4>
              <p className="text-sm text-gray-600 mb-3">
                You're signed in with Google OAuth. To manage your password, use Google's account settings.
              </p>
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-black text-blue-600 hover:text-blue-700 underline"
              >
                Go to Google Account Security →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Section */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b-2 border-gray-200">
          <h3 className="text-lg font-black text-brand-black flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Session Management
          </h3>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Sign out from your account on this device.
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-black hover:bg-red-700 transition-all duration-200 disabled:opacity-50"
          >
            {signingOut ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing Out...
              </span>
            ) : (
              'Sign Out'
            )}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl border-2 border-red-200 overflow-hidden">
        <div className="px-6 py-4 bg-red-100 border-b-2 border-red-200">
          <h3 className="text-lg font-black text-red-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Danger Zone
          </h3>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-black text-red-900 mb-1">Delete Account</h4>
              <p className="text-sm text-red-800 mb-3">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                disabled
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-black opacity-50 cursor-not-allowed"
              >
                Delete Account (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <WorkspaceGuard>
      <AccountContent />
    </WorkspaceGuard>
  );
}
