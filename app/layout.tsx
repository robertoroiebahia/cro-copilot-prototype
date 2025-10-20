'use client';

import type { Metadata } from 'next'
import AppSidebar from '@/components/AppSidebar'
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
        {showSidebar && (
          <AppSidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={handleToggleSidebar}
          />
        )}
        <main
          className={`min-h-screen transition-all duration-300 ${
            showSidebar ? (isSidebarCollapsed ? 'ml-20' : 'ml-64') : ''
          }`}
        >
          {children}
        </main>
      </body>
    </html>
  )
}
