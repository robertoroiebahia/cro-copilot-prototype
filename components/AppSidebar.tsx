'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSubscription } from '@/lib/billing/useSubscription';
import WorkspaceSelector from './WorkspaceSelector';
import { useWorkspace } from './WorkspaceContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function AppSidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { selectedWorkspaceId } = useWorkspace();
  const { isPro, loading } = useSubscription();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  if (pathname?.startsWith('/login') || pathname?.startsWith('/signup')) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Section: Logo + Workspace */}
      <div className="flex-shrink-0 border-b border-gray-200">
        {/* Logo & Brand */}
        <div className="px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-brand-gold rounded-lg flex items-center justify-center transition-all duration-200 group-hover:shadow-lg flex-shrink-0">
              <span className="text-base font-black text-brand-black">G</span>
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div className="text-sm font-black text-brand-black">Galo CRO</div>
              </div>
            )}
          </Link>
        </div>

        {/* Workspace Selector */}
        <WorkspaceSelector isCollapsed={isCollapsed} />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <NavItem
          href="/dashboard"
          label="Dashboard"
          icon={<HomeIcon />}
          isActive={pathname === '/dashboard'}
          isCollapsed={isCollapsed}
        />

        {/* Divider */}
        {!isCollapsed && <div className="h-px bg-gray-200 my-2" />}

        {/* Research Methods Section */}
        {!isCollapsed && (
          <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Research Methods
          </div>
        )}

        <NavItem
          href="/analyze"
          label="Page Analysis"
          icon={<PageIcon />}
          isActive={isActive('/analyze') && pathname === '/analyze'}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
        />

        <NavItem
          href="/analyze/ga"
          label="GA4 Analysis"
          icon={<ChartIcon />}
          isActive={isActive('/analyze/ga')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
        />

        <NavItem
          href="/analyze/survey"
          label="Surveys"
          icon={<SurveyIcon />}
          isActive={isActive('/analyze/survey')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
          isPro={!isPro}
        />

        <NavItem
          href="/analyze/review-mining"
          label="Review Mining"
          icon={<ReviewIcon />}
          isActive={isActive('/analyze/review-mining')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
          isPro={!isPro}
        />

        <NavItem
          href="/analyze/onsite-poll"
          label="On-Site Poll"
          icon={<PollIcon />}
          isActive={isActive('/analyze/onsite-poll')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
          isPro={!isPro}
        />

        <NavItem
          href="/analyze/heatmap"
          label="Heatmaps"
          icon={<HeatmapIcon />}
          isActive={isActive('/analyze/heatmap')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
          comingSoon={true}
          isPro={!isPro}
        />

        <NavItem
          href="/analyze/user-testing"
          label="User Testing"
          icon={<UsersIcon />}
          isActive={isActive('/analyze/user-testing')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
          comingSoon={true}
          isPro={!isPro}
        />

        <NavItem
          href="/analyze/competitor"
          label="Competitors"
          icon={<SearchIcon />}
          isActive={isActive('/analyze/competitor')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
          comingSoon={true}
        />

        {/* Divider */}
        {!isCollapsed && <div className="h-px bg-gray-200 my-2" />}

        {/* Results Section */}
        {!isCollapsed && (
          <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Results
          </div>
        )}

        <NavItem
          href="/analyses"
          label="All Analyses"
          icon={<ListIcon />}
          isActive={pathname === '/analyses'}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
        />

        {/* Divider */}
        {!isCollapsed && <div className="h-px bg-gray-200 my-2" />}

        {/* Insights & Strategy Section */}
        {!isCollapsed && (
          <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Insights & Strategy
          </div>
        )}

        <NavItem
          href="/insights"
          label="Insights"
          icon={<LightbulbIcon />}
          isActive={isActive('/insights')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
        />

        <NavItem
          href="/themes"
          label="Themes"
          icon={<GridIcon />}
          isActive={isActive('/themes')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
        />

        <NavItem
          href="/hypotheses"
          label="Hypotheses"
          icon={<FlaskIcon />}
          isActive={isActive('/hypotheses')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
        />

        <NavItem
          href="/experiments"
          label="Experiments"
          icon={<BeakerIcon />}
          isActive={isActive('/experiments')}
          isCollapsed={isCollapsed}
          disabled={!selectedWorkspaceId}
        />

        {/* Divider */}
        {!isCollapsed && <div className="h-px bg-gray-200 my-2" />}

        {/* Settings Section */}
        {!isCollapsed && (
          <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Settings
          </div>
        )}

        <NavItem
          href="/settings/billing"
          label="Billing"
          icon={<SettingsIcon />}
          isActive={isActive('/settings')}
          isCollapsed={isCollapsed}
        />
      </nav>

      {/* User Menu - Bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-all"
            title={isCollapsed ? user?.email || 'Account' : undefined}
          >
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 bg-brand-gold rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-brand-black">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              {!loading && isPro && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-gold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-bold text-brand-black truncate">{user?.email || 'User'}</div>
                    {!loading && isPro && (
                      <span className="px-1.5 py-0.5 bg-gradient-to-r from-brand-gold to-yellow-400 text-black border border-brand-gold text-[10px] font-black rounded uppercase tracking-wide flex-shrink-0 shadow-sm">
                        Pro
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Account</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <SettingsIcon />
                <span className="text-sm font-medium text-brand-black">Settings</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors text-left"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm font-medium text-red-600">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={`w-3 h-3 text-gray-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </aside>
  );
}

// Reusable NavItem Component
function NavItem({
  href,
  label,
  icon,
  isActive,
  isCollapsed,
  disabled = false,
  comingSoon = false,
  isPro = false
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCollapsed: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  isPro?: boolean;
}) {
  if (disabled) {
    return (
      <div
        className="flex items-center gap-3 px-2 py-2 rounded-lg opacity-50 cursor-not-allowed"
        title={isCollapsed ? `${label} (Select a workspace)` : undefined}
      >
        <div className="flex-shrink-0 text-gray-400">
          {icon}
        </div>
        {!isCollapsed && (
          <span className="text-sm truncate text-gray-400">{label}</span>
        )}
      </div>
    );
  }

  if (comingSoon) {
    return (
      <div
        className="flex items-center gap-3 px-2 py-2 rounded-lg opacity-60 cursor-not-allowed"
        title={isCollapsed ? `${label} - Coming Soon` : undefined}
      >
        <div className="flex-shrink-0 text-gray-400">
          {icon}
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm truncate text-gray-500">{label}</span>
            {isPro && (
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-brand-gold to-yellow-400 text-black border border-brand-gold text-[10px] font-black rounded uppercase tracking-wide flex-shrink-0 shadow-sm opacity-70">
                Pro
              </span>
            )}
            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wide">
              Soon
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all group ${
        isActive
          ? 'bg-brand-gold/10 text-brand-gold font-semibold'
          : 'text-gray-700 hover:bg-gray-100 font-medium'
      }`}
      title={isCollapsed ? label : undefined}
    >
      <div className={`flex-shrink-0 ${isActive ? 'text-brand-gold' : 'text-gray-500 group-hover:text-gray-700'}`}>
        {icon}
      </div>
      {!isCollapsed && (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm truncate">{label}</span>
          {isPro && (
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-brand-gold to-yellow-400 text-black border border-brand-gold text-[10px] font-black rounded uppercase tracking-wide flex-shrink-0 shadow-sm">
              Pro
            </span>
          )}
        </div>
      )}
      {isActive && !isCollapsed && !isPro && (
        <div className="ml-auto w-1 h-1 bg-brand-gold rounded-full" />
      )}
    </Link>
  );
}

// Icon Components (optimized for size)
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const PageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const HeatmapIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const SurveyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const ReviewIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const PollIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const LightbulbIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
  </svg>
);

const FlaskIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const BeakerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
