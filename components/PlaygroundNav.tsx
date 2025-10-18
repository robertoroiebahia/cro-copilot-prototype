'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  BeakerIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Tool {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tools: Tool[] = [
  {
    name: 'Scraper Test',
    href: '/playground/tools/scraper',
    icon: MagnifyingGlassIcon,
    description: 'Compare web scraping methods',
  },
  // More tools will be added here later
];

export function PlaygroundNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <BeakerIcon className="w-6 h-6 text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900">Playground</h1>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          {mobileMenuOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`
        fixed lg:static
        inset-y-0 left-0
        w-64 bg-white border-r border-gray-200
        flex flex-col
        transform transition-transform duration-200 ease-in-out
        z-50
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <BeakerIcon className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">Playground</h1>
        </div>
        <p className="text-sm text-gray-600">Testing & Development Tools</p>
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3 mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3">
            Tools
          </h2>
        </div>
        <div className="space-y-1 px-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = pathname === tool.href;

            return (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-start gap-3 px-3 py-2 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {tool.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {tool.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </nav>
    </>
  );
}
