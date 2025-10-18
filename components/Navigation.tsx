'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredNavLink, setHoveredNavLink] = useState<string | null>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check authentication
  useEffect(() => {
    const supabase = createClient();

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email || null);
      setLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email || null);
      setLoading(false);
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

  // Navigation links for authenticated users
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/queue', label: 'Test Queue', icon: 'queue' },
    { href: '/analyze', label: 'New Analysis', icon: 'analyze' },
  ];

  const isActive = (path: string) => pathname === path;

  // Don't show nav on login/signup/playground pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/playground')) {
    return null;
  }

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-200 border-b ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md border-gray-200 shadow-sm'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-brand-gold rounded flex items-center justify-center transition-all duration-200 group-hover:shadow-[0_0_0_2px_rgba(245,197,66,0.5)]">
              <span className="text-lg font-black text-brand-black">G</span>
            </div>
            <div>
              <span className="text-lg font-black text-brand-black hidden sm:block">
                Galo
              </span>
              <span className="text-lg font-black text-brand-black sm:hidden">
                G
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {!loading && (
              <>
                {isLoggedIn ? (
                  <>
                    {/* Nav Links */}
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="px-4 py-2 text-sm font-bold rounded transition-all duration-200"
                        style={{
                          color: isActive(link.href) ? '#F5C542' : '#0E0E0E',
                          backgroundColor: hoveredNavLink === link.href && !isActive(link.href) ? '#FEF3C7' : '#FFFFFF'
                        }}
                        onMouseEnter={() => setHoveredNavLink(link.href)}
                        onMouseLeave={() => setHoveredNavLink(null)}
                      >
                        {link.label}
                      </Link>
                    ))}

                    {/* User Menu */}
                    <div className="relative ml-2" ref={menuRef}>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all duration-200"
                        style={{
                          color: '#0E0E0E',
                          backgroundColor: hoveredButton === 'user-menu' ? '#FEF3C7' : '#FFFFFF'
                        }}
                        onMouseEnter={() => setHoveredButton('user-menu')}
                        onMouseLeave={() => setHoveredButton(null)}
                      >
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white text-sm font-black">
                          {userEmail?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            showUserMenu ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded border border-gray-200 py-1 animate-slide-up shadow-lg">
                          <div className="px-4 py-3 border-b border-gray-200">
                            <p className="text-sm font-bold text-brand-black truncate">
                              {userEmail}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 font-medium">
                              Account
                            </p>
                          </div>
                          <Link
                            href="/dashboard"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-brand-gray-light hover:text-brand-black transition-all duration-200 font-medium"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                              />
                            </svg>
                            Dashboard
                          </Link>
                          <Link
                            href="/queue"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-brand-gray-light hover:text-brand-black transition-all duration-200 font-medium"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            Test Queue
                          </Link>
                          <Link
                            href="/analyze"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-brand-gray-light hover:text-brand-black transition-all duration-200 font-medium"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            New Analysis
                          </Link>
                          <Link
                            href="/playground"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-brand-gray-light hover:text-brand-black transition-all duration-200 font-medium"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                              />
                            </svg>
                            Playground
                          </Link>
                          <div className="border-t border-gray-200 my-1" />
                          <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-brand-danger hover:bg-brand-danger/10 transition-all duration-200 font-bold"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            Sign Out
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Not logged in */}
                    <Link
                      href="/login"
                      className="px-4 py-2 text-sm font-bold rounded transition-all duration-200"
                      style={{
                        color: '#0E0E0E',
                        backgroundColor: hoveredButton === 'sign-in' ? '#FEF3C7' : '#FFFFFF'
                      }}
                      onMouseEnter={() => setHoveredButton('sign-in')}
                      onMouseLeave={() => setHoveredButton(null)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="px-5 py-2.5 text-white text-sm font-black rounded transition-all duration-300"
                      style={{
                        backgroundColor: hoveredButton === 'start-free' ? '#1A1A1A' : '#0E0E0E',
                        transform: hoveredButton === 'start-free' ? 'translateY(-1px) scale(1.02)' : 'translateY(0) scale(1)',
                        boxShadow: hoveredButton === 'start-free'
                          ? '0 12px 35px -8px rgba(212, 165, 116, 0.5), 0 0 0 2px rgba(212, 165, 116, 0.4)'
                          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                      onMouseEnter={() => setHoveredButton('start-free')}
                      onMouseLeave={() => setHoveredButton(null)}
                    >
                      Start Free
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded text-gray-600 hover:bg-brand-gray-light transition-all duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 animate-slide-up">
            {!loading && (
              <>
                {isLoggedIn ? (
                  <div className="space-y-2">
                    {/* User Info */}
                    <div className="px-3 py-2 bg-gray-50 rounded mb-3 border border-gray-200">
                      <p className="text-sm font-bold text-brand-black truncate">
                        {userEmail}
                      </p>
                    </div>

                    {/* Nav Links */}
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setHoveredNavLink(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded text-sm font-bold transition-all duration-200"
                        style={{
                          color: isActive(link.href) ? '#F5C542' : '#0E0E0E',
                          backgroundColor: hoveredNavLink === `mobile-${link.href}` && !isActive(link.href) ? '#FEF3C7' : '#FFFFFF'
                        }}
                        onMouseEnter={() => setHoveredNavLink(`mobile-${link.href}`)}
                        onMouseLeave={() => setHoveredNavLink(null)}
                      >
                        {link.href === '/dashboard' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        )}
                        {link.href === '/queue' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        )}
                        {link.href === '/analyze' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                        {link.label}
                      </Link>
                    ))}

                    {/* Sign Out */}
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm font-bold text-brand-danger hover:bg-brand-danger/10 rounded transition-all duration-200"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2.5 text-sm font-bold text-gray-600 hover:bg-brand-gray-light hover:text-brand-black rounded transition-all duration-200"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2.5 bg-brand-gold text-brand-black text-sm font-black rounded transition-all duration-200 text-center hover:shadow-[0_0_0_2px_rgba(245,197,66,0.5)]"
                    >
                      Start Free
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
