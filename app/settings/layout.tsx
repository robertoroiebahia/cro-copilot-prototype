'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSubscription } from '@/lib/billing/useSubscription';

interface SettingsNavItem {
  href: string;
  label: string;
  icon: JSX.Element;
  description: string;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isPro } = useSubscription();

  const navItems: SettingsNavItem[] = [
    {
      href: '/settings/billing',
      label: 'Billing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      description: 'Manage your subscription',
    },
    {
      href: '/settings/usage',
      label: 'Usage',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'View your current usage',
    },
    {
      href: '/settings/account',
      label: 'Account',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      description: 'Manage your account settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-6 py-6 mt-16">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg border border-gray-200 p-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-start gap-3 px-3 py-3 rounded-lg mb-1 transition-all duration-200
                      ${
                        isActive
                          ? 'bg-brand-gold text-brand-black'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`flex-shrink-0 mt-0.5 ${isActive ? 'text-brand-black' : 'text-gray-400'}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-black mb-0.5 ${isActive ? 'text-brand-black' : 'text-gray-900'}`}>
                        {item.label}
                      </div>
                      <div className={`text-xs ${isActive ? 'text-brand-black/70' : 'text-gray-500'}`}>
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Quick Stats Card */}
            <div className="mt-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xs font-black text-purple-900">Need Help?</h3>
              </div>
              <p className="text-xs text-purple-800 mb-3">
                Have questions about your plan or need assistance?
              </p>
              <a
                href="mailto:support@example.com"
                className="text-xs font-black text-purple-600 hover:text-purple-700 underline"
              >
                Contact Support
              </a>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
