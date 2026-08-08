'use client';

import { createContext, useContext, ReactNode } from 'react';

interface MobileSidebarContextType {
  openMobileSidebar: () => void;
}

export const MobileSidebarContext = createContext<MobileSidebarContextType>({
  openMobileSidebar: () => {},
});

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}
