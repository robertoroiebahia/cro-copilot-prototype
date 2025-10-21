'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useWorkspace } from './WorkspaceContext';

interface WorkspaceSelectorProps {
  isCollapsed: boolean;
}

export default function WorkspaceSelector({ isCollapsed }: WorkspaceSelectorProps) {
  const { workspaces, selectedWorkspace, selectWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading || workspaces.length === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="px-4 py-3 border-b border-gray-200">
        <div
          className="w-8 h-8 bg-brand-gold/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-brand-gold/30 transition-colors"
          title={selectedWorkspace?.name || 'Select workspace'}
        >
          <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-gray-200" ref={dropdownRef}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-brand-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="text-sm font-bold text-brand-black truncate">
                {selectedWorkspace?.name || 'Select Workspace'}
              </div>
              <div className="text-xs text-brand-text-tertiary">
                {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
              </div>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-50 max-h-64 overflow-y-auto">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => {
                  selectWorkspace(workspace.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                  workspace.id === selectedWorkspace?.id ? 'bg-brand-gold/5' : ''
                }`}
              >
                <div className="w-8 h-8 bg-brand-gold/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-brand-black truncate">{workspace.name}</div>
                    {workspace.id === selectedWorkspace?.id && (
                      <svg className="w-4 h-4 text-brand-gold flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {workspace.description && (
                    <div className="text-xs text-brand-text-tertiary mt-0.5 truncate">
                      {workspace.description}
                    </div>
                  )}
                  {workspace.website_url && (
                    <div className="text-xs text-brand-text-tertiary mt-0.5 truncate">
                      {workspace.website_url}
                    </div>
                  )}
                  {workspace.ga4_property_id && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded uppercase tracking-wide">
                        GA4 Connected
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}

            {/* Manage Workspaces Link */}
            <Link
              href="/workspaces"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors border-t border-gray-200 text-sm font-medium text-brand-gold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Manage Workspaces
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
