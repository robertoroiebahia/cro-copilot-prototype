'use client';

import type { Metadata } from 'next'
import AppSidebar from '@/components/AppSidebar'
import MobileHeader from '@/components/MobileHeader'
import MobileSubNav from '@/components/MobileSubNav'
import GlobalProgressTracker from '@/components/GlobalProgressTracker'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { WorkspaceProvider } from '@/components/WorkspaceContext'
import './globals.css'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if we should show the sidebar
  const showSidebar = pathname &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/signup') &&
    pathname !== '/';

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Save sidebar state to localStorage
  const handleToggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  return (
    <html lang="en">
      <head>
        <title>CRO Copilot - AI-Powered CRO Analysis</title>
        <meta name="description" content="AI-powered funnel analysis for DTC brands. Turn any landing page into a conversion machine." />
      </head>
      <body className="bg-gray-50">
        <AuthProvider>
          <WorkspaceProvider>
            {/* Mobile Header - Sticky at top on mobile */}
            {showSidebar && <MobileHeader onMenuToggle={setIsMobileMenuOpen} />}

          {/* Mobile Sub-Navigation - Contextual tabs below header (hidden when menu open) */}
          {showSidebar && !isMobileMenuOpen && <MobileSubNav />}

          {/* Desktop Sidebar - Hidden on mobile (< 1024px), visible on desktop */}
          {showSidebar && (
            <div className="hidden lg:block">
              <AppSidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={handleToggleSidebar}
              />
            </div>
          )}

          {/* Main Content */}
          <main
            className={`min-h-screen transition-all duration-300 ${
              showSidebar ? 'lg:ml-64 lg:ml-20' : ''
            } ${
              showSidebar && isSidebarCollapsed ? 'lg:ml-20' : ''
            } ${
              showSidebar && !isSidebarCollapsed ? 'lg:ml-64' : ''
            }`}
          >
            {children}
          </main>

          {/* Global Progress Tracker - Fixed position, visible across all pages */}
          <GlobalProgressTracker />
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
