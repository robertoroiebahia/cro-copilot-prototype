'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function AppSidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['analysis']));
  const menuRef = useRef<HTMLDivElement>(null);

  // Check authentication
  useEffect(() => {
    const supabase = createClient();

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email || null);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close user menu when clicking outside
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
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserEmail(null);
    setShowUserMenu(false);
    router.push('/');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const analysisTypes = [
    {
      href: '/analyze',
      label: 'Page Analysis',
      icon: '📸',
      description: 'Screenshot CRO analysis',
      isLive: true,
    },
    {
      href: '/analyze/ga',
      label: 'GA Analysis',
      icon: '📊',
      description: 'Google Analytics data',
      isLive: false,
    },
    {
      href: '/analyze/survey',
      label: 'Survey Analysis',
      icon: '📋',
      description: 'Post-purchase surveys',
      isLive: false,
    },
    {
      href: '/analyze/heatmap',
      label: 'Heatmap Analysis',
      icon: '🔥',
      description: 'Session recordings',
      isLive: false,
    },
    {
      href: '/analyze/user-testing',
      label: 'User Testing',
      icon: '👥',
      description: 'Moderated sessions',
      isLive: false,
    },
    {
      href: '/analyze/competitor',
      label: 'Competitor',
      icon: '🔍',
      description: 'Competitive research',
      isLive: false,
    },
  ];

  const researchItems = [
    {
      href: '/insights',
      label: 'All Insights',
      icon: '💡',
      description: 'View all research insights',
    },
    {
      href: '/themes',
      label: 'Themes',
      icon: '🎯',
      description: 'Clustered patterns',
    },
    {
      href: '/hypotheses',
      label: 'Hypotheses',
      icon: '🧪',
      description: 'Testable predictions',
    },
    {
      href: '/experiments',
      label: 'Experiments',
      icon: '📊',
      description: 'A/B test results',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/analyze') {
      return pathname === '/analyze';
    }
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const isAnalysisActive = () => {
    return pathname === '/analyze' || pathname?.startsWith('/analyze/');
  };

  // Don't show sidebar on login/signup pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/signup')) {
    return null;
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Logo & Brand */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-brand-gold rounded flex items-center justify-center transition-all duration-200 group-hover:shadow-[0_0_0_2px_rgba(245,197,66,0.5)] flex-shrink-0">
            <span className="text-xl font-black text-brand-black">G</span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="text-lg font-black text-brand-black">Galo</div>
              <div className="text-[10px] text-brand-text-tertiary uppercase tracking-wider font-bold">
                CRO Copilot
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
            pathname === '/dashboard'
              ? 'bg-brand-gold text-brand-black font-black'
              : 'text-brand-text-secondary hover:bg-gray-100 font-bold'
          }`}
          title={isCollapsed ? 'Dashboard' : undefined}
        >
          {pathname === '/dashboard' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-black rounded-r" />
          )}
          <div className={`flex-shrink-0 text-xl ${pathname === '/dashboard' ? '' : 'group-hover:scale-110 transition-transform'}`}>
            🏠
          </div>
          {!isCollapsed && <span className="text-sm truncate">Dashboard</span>}
        </Link>

        {/* Run Analysis Section */}
        {!isCollapsed && (
          <div>
            <button
              onClick={() => toggleSection('analysis')}
              className="w-full flex items-center justify-between px-4 py-2 mb-2 hover:bg-gray-50 rounded-lg transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">▶️</span>
                <h3 className="text-xs font-black text-brand-text-tertiary uppercase tracking-wider">
                  Run Analysis
                </h3>
              </div>
              <svg
                className={`w-4 h-4 text-brand-text-tertiary transition-transform duration-200 ${
                  expandedSections.has('analysis') ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSections.has('analysis') && (
              <div className="space-y-1 ml-2">
                {analysisTypes.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative ${
                      isActive(item.href)
                        ? 'bg-brand-gold/20 text-brand-black font-black border-l-2 border-brand-gold'
                        : 'text-brand-text-secondary hover:bg-gray-50 font-medium'
                    }`}
                  >
                    <div className={`flex-shrink-0 text-base ${isActive(item.href) ? '' : 'group-hover:scale-110 transition-transform'}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs truncate">{item.label}</span>
                        {item.isLive && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded uppercase">
                            Live
                          </span>
                        )}
                        {!item.isLive && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black rounded uppercase">
                            Soon
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-brand-text-tertiary truncate">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsed Analysis Section */}
        {isCollapsed && (
          <div className="space-y-1">
            <Link
              href="/analyze"
              className={`flex items-center justify-center p-3 rounded-lg transition-all duration-200 group relative ${
                isAnalysisActive()
                  ? 'bg-brand-gold text-brand-black'
                  : 'text-brand-text-secondary hover:bg-gray-100'
              }`}
              title="Run Analysis"
            >
              {isAnalysisActive() && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-black rounded-r" />
              )}
              <div className="text-xl group-hover:scale-110 transition-transform">
                ▶️
              </div>
            </Link>
          </div>
        )}

        {/* Research Insights Section */}
        {!isCollapsed && (
          <div className="pt-4 border-t border-gray-200">
            <div className="px-4 mb-3">
              <h3 className="text-xs font-black text-brand-text-tertiary uppercase tracking-wider">
                💡 Research Insights
              </h3>
            </div>
            <div className="space-y-1">
              {researchItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                    isActive(item.href)
                      ? 'bg-brand-gold text-brand-black font-black'
                      : 'text-brand-text-secondary hover:bg-gray-100 font-bold'
                  }`}
                >
                  {isActive(item.href) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-black rounded-r" />
                  )}
                  <div className={`flex-shrink-0 text-xl ${isActive(item.href) ? '' : 'group-hover:scale-110 transition-transform'}`}>
                    {item.icon}
                  </div>
                  <span className="text-sm truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed Research Section */}
        {isCollapsed && (
          <div className="space-y-1">
            {researchItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center p-3 rounded-lg transition-all duration-200 group relative ${
                  isActive(item.href)
                    ? 'bg-brand-gold text-brand-black'
                    : 'text-brand-text-secondary hover:bg-gray-100'
                }`}
                title={item.label}
              >
                {isActive(item.href) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-black rounded-r" />
                )}
                <div className="text-xl group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Test Queue & Settings */}
        {!isCollapsed && (
          <div className="pt-4 border-t border-gray-200 space-y-1">
            <Link
              href="/queue"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                pathname === '/queue'
                  ? 'bg-brand-gold text-brand-black font-black'
                  : 'text-brand-text-secondary hover:bg-gray-100 font-bold'
              }`}
            >
              {pathname === '/queue' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-black rounded-r" />
              )}
              <div className={`flex-shrink-0 text-xl ${pathname === '/queue' ? '' : 'group-hover:scale-110 transition-transform'}`}>
                📋
              </div>
              <span className="text-sm truncate">Test Queue</span>
            </Link>

            <Link
              href="/settings"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                pathname === '/settings'
                  ? 'bg-brand-gold text-brand-black font-black'
                  : 'text-brand-text-secondary hover:bg-gray-100 font-bold'
              }`}
            >
              {pathname === '/settings' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-black rounded-r" />
              )}
              <div className={`flex-shrink-0 text-xl ${pathname === '/settings' ? '' : 'group-hover:scale-110 transition-transform'}`}>
                ⚙️
              </div>
              <span className="text-sm truncate">Settings</span>
            </Link>
          </div>
        )}

        {/* Collapsed Queue & Settings */}
        {isCollapsed && (
          <div className="pt-4 border-t border-gray-200 space-y-1">
            <Link
              href="/queue"
              className={`flex items-center justify-center p-3 rounded-lg transition-all duration-200 group relative ${
                pathname === '/queue'
                  ? 'bg-brand-gold text-brand-black'
                  : 'text-brand-text-secondary hover:bg-gray-100'
              }`}
              title="Test Queue"
            >
              {pathname === '/queue' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-black rounded-r" />
              )}
              <div className="text-xl group-hover:scale-110 transition-transform">
                📋
              </div>
            </Link>

            <Link
              href="/settings"
              className={`flex items-center justify-center p-3 rounded-lg transition-all duration-200 group relative ${
                pathname === '/settings'
                  ? 'bg-brand-gold text-brand-black'
                  : 'text-brand-text-secondary hover:bg-gray-100'
              }`}
              title="Settings"
            >
              {pathname === '/settings' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-black rounded-r" />
              )}
              <div className="text-xl group-hover:scale-110 transition-transform">
                ⚙️
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-100 transition-all duration-200 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? userEmail || 'User' : undefined}
          >
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-sm font-black flex-shrink-0">
              {userEmail?.[0]?.toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-bold text-brand-black truncate">
                    {userEmail}
                  </div>
                  <div className="text-xs text-brand-text-tertiary">Account</div>
                </div>
                <svg
                  className={`w-4 h-4 text-brand-text-tertiary transition-transform duration-200 flex-shrink-0 ${
                    showUserMenu ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && !isCollapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-brand-danger hover:bg-brand-danger/10 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-brand-gold hover:border-brand-gold transition-all duration-200 shadow-sm"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={`w-3 h-3 text-brand-text-secondary transition-transform duration-200 ${
            isCollapsed ? 'rotate-180' : ''
          }`}
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
