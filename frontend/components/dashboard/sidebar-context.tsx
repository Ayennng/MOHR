'use client';

import React, { createContext, useContext, useState, useSyncExternalStore, ReactNode } from 'react';

// Whether the sidebar is expanded. Shared by the sidebar (toggle button) and the
// app layout (content margin). Navigation state lives in the URL, not here.
interface SidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SMALL_SCREEN = '(max-width: 1023px)';
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(SMALL_SCREEN);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Collapsed by default on small screens, open on large ones, until the user toggles it
  const isSmall = useSyncExternalStore(subscribe, () => window.matchMedia(SMALL_SCREEN).matches, () => false);
  const [choice, setChoice] = useState<boolean | null>(null);

  return (
    <SidebarContext.Provider value={{ sidebarOpen: choice ?? !isSmall, setSidebarOpen: setChoice }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
