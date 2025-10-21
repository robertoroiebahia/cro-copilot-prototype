'use client';

import { useUser } from '@/lib/auth/use-user';
import { useRouter } from 'next/navigation';

export function UserProfile() {
  const { user, loading, logout } = useUser();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24"></div>
          <div className="h-2 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
      {user.picture ? (
        <img
          src={user.picture}
          alt={user.name}
          className="w-10 h-10 rounded-full ring-2 ring-white"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user.name}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {user.email}
        </p>
      </div>
      <button
        onClick={logout}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
        title="Sign out"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
