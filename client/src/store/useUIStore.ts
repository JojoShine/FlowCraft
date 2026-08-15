import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  aiPanelOpen: boolean;
  selectedProjectId: string | null;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;
  setSelectedProject: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  aiPanelOpen: false,
  selectedProjectId: null,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleAIPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
}));
