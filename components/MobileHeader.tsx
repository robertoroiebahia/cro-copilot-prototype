'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useWorkspace } from './WorkspaceContext';
import { useSubscription } from '@/lib/billing/useSubscription';

interface MobileHeaderProps {
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function MobileHeader({ onMenuToggle }: MobileHeaderProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { selectedWorkspace } = useWorkspace();
  const { isPro } = useSubscription();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const toggleMenu = (open: boolean) => {
    setIsMenuOpen(open);
    onMenuToggle?.(open);
  };

  // Close menu when route changes
  useEffect(() => {
    toggleMenu(false);
  }, [pathname]);

  const isActive = (path: string) => pathname?.startsWith(path);

  const linkClass = (active: boolean) =>
    `block px-4 py-4 rounded-xl font-bold text-base transition-all duration-200 ${
      active
        ? 'bg-white text-brand-gold border-2 border-brand-gold shadow-sm [&_svg]:stroke-brand-gold'
        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 [&_svg]:stroke-gray-500'
    }`;

  return (
    <>
      {/* Sticky Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 h-16">
          {/* Logo/Brand */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center">
              <span className="text-brand-black font-black text-base">G</span>
            </div>
            <span className="font-black text-brand-black text-xl">Galo</span>
          </Link>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Full-Screen Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-50 overflow-y-auto" style={{ top: '64px' }}>
          <div className="p-5 pb-20">
            {/* Workspace Info */}
            {selectedWorkspace && (
              <div className="mb-5 bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm">
                <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">WORKSPACE</div>
                <div className="font-black text-brand-black text-base mb-3">{selectedWorkspace.name}</div>
                <Link
                  href="/workspaces"
                  className="text-sm text-brand-gold font-bold hover:text-yellow-600 transition-colors inline-flex items-center gap-1"
                >
                  Switch workspace
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}

            {/* Upgrade to Pro CTA - Only show for free users (hide while loading) */}
            {!isPro && user && (
              <Link
                href="/settings/billing"
                className="block mb-5 px-6 py-5 bg-gradient-to-r from-brand-gold to-yellow-500 text-brand-black font-black text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Upgrade to Pro</span>
                </div>
                <p className="text-sm font-bold opacity-90">Unlock unlimited analyses & features</p>
              </Link>
            )}

            {/* Navigation Menu */}
            <nav className="space-y-6">
              {/* Dashboard */}
              <Link href="/dashboard" className={linkClass(pathname === '/dashboard')}>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Dashboard</span>
                </div>
              </Link>

              {/* Research Methods Section */}
              <div>
                <div className="text-xs font-black text-gray-500 uppercase tracking-wide px-2 mb-3">RESEARCH METHODS</div>
                <div className="space-y-2">
                  <Link href="/analyze" className={linkClass(isActive('/analyze') && pathname === '/analyze')}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Page Analysis</span>
                    </div>
                  </Link>

                  <Link href="/analyze/ga" className={linkClass(isActive('/analyze/ga'))}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Google Analytics</span>
                    </div>
                  </Link>

                  <Link href="/analyze/shopify-orders" className={linkClass(isActive('/analyze/shopify-orders'))}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span className="flex-1">Shopify AOV</span>
                      {!isPro && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-brand-gold to-yellow-400 text-black border border-brand-gold text-[10px] font-black rounded uppercase tracking-wide shadow-sm">
                          Pro
                        </span>
                      )}
                    </div>
                  </Link>

                  <Link href="/analyze/survey" className={linkClass(isActive('/analyze/survey'))}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span className="flex-1">Surveys</span>
                      {!isPro && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-brand-gold to-yellow-400 text-black border border-brand-gold text-[10px] font-black rounded uppercase tracking-wide shadow-sm">
                          Pro
                        </span>
                      )}
                    </div>
                  </Link>

                  <Link href="/analyze/review-mining" className={linkClass(isActive('/analyze/review-mining'))}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span className="flex-1">Review Mining</span>
                      {!isPro && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-brand-gold to-yellow-400 text-black border border-brand-gold text-[10px] font-black rounded uppercase tracking-wide shadow-sm">
                          Pro
                        </span>
                      )}
                    </div>
                  </Link>

                  <Link href="/analyze/onsite-poll" className={linkClass(isActive('/analyze/onsite-poll'))}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span className="flex-1">On-Site Poll</span>
                      {!isPro && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-brand-gold to-yellow-400 text-black border border-brand-gold text-[10px] font-black rounded uppercase tracking-wide shadow-sm">
                          Pro
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              </div>

              {/* Results Section */}
              <div>
                <div className="text-xs font-black text-gray-500 uppercase tracking-wide px-2 mb-3">RESULTS</div>
                <Link href="/analyses" className={linkClass(pathname === '/analyses')}>
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>All Analyses</span>
                  </div>
                </Link>
              </div>

              {/* Insights & Strategy Section */}
              <div>
                <div className="text-xs font-black text-gray-500 uppercase tracking-wide px-2 mb-3">INSIGHTS & STRATEGY</div>
                <div className="space-y-2">
                  <Link href="/insights" className={linkClass(pathname === '/insights')}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Insights</span>
                    </div>
                  </Link>

                  <Link href="/themes" className={linkClass(pathname === '/themes')}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                      </svg>
                      <span>Themes</span>
                    </div>
                  </Link>

                  <Link href="/hypotheses" className={linkClass(pathname === '/hypotheses')}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      <span>Hypotheses</span>
                    </div>
                  </Link>

                  <Link href="/experiments" className={linkClass(pathname === '/experiments')}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                      <span>Experiments</span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Settings Section */}
              <div>
                <div className="text-xs font-black text-gray-500 uppercase tracking-wide px-2 mb-3">SETTINGS</div>
                <Link href="/settings/billing" className={linkClass(pathname?.startsWith('/settings'))}>
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Settings</span>
                  </div>
                </Link>
              </div>

              {/* Account */}
              <div className="pt-4 border-t-2 border-gray-200">
                {user?.email && (
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-5 mb-3 shadow-sm">
                    <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">SIGNED IN AS</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-brand-black truncate">{user.email}</div>
                      {isPro && (
                        <span className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-brand-gold to-yellow-400 text-black border-2 border-brand-gold text-xs font-black rounded-lg uppercase shadow-md">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-4 rounded-xl font-bold text-base bg-white text-red-600 hover:bg-red-50 border-2 border-gray-200 hover:border-red-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </div>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
