'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  ga4_property_id: string | null;
  is_active: boolean;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  selectedWorkspaceId: string | null;
  isLoading: boolean;
  selectWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setWorkspaces([]);
        setSelectedWorkspaceId(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, description, website_url, ga4_property_id, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch workspaces:', error);
        setWorkspaces([]);
      } else {
        setWorkspaces(data || []);

        // Auto-select first workspace if none selected
        if (data && data.length > 0 && !selectedWorkspaceId) {
          // Try to get from localStorage first
          const stored = localStorage.getItem('selectedWorkspaceId');
          const validStored = data.find(w => w.id === stored);

          if (validStored) {
            setSelectedWorkspaceId(stored);
          } else {
            setSelectedWorkspaceId(data[0].id);
            localStorage.setItem('selectedWorkspaceId', data[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setWorkspaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchWorkspaces();
      } else if (event === 'SIGNED_OUT') {
        setWorkspaces([]);
        setSelectedWorkspaceId(null);
        localStorage.removeItem('selectedWorkspaceId');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const selectWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    localStorage.setItem('selectedWorkspaceId', workspaceId);
  };

  const refreshWorkspaces = async () => {
    await fetchWorkspaces();
  };

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId) || null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        selectedWorkspace,
        selectedWorkspaceId,
        isLoading,
        selectWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
