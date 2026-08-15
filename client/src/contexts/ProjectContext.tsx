import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProjectContextType {
  selectedProjectId: string | null;
  selectProject: (id: string) => void;
  clearSelection: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'flowcraft_selected_project';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem(STORAGE_KEY, selectedProjectId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedProjectId]);

  const selectProject = (id: string) => {
    setSelectedProjectId(id);
  };

  const clearSelection = () => {
    setSelectedProjectId(null);
  };

  return (
    <ProjectContext.Provider value={{ selectedProjectId, selectProject, clearSelection }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
