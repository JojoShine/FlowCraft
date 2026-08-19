import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { projectsApi } from '../services/api';
import { onDataChange } from '../utils/dataEvents';
import { useAuth } from './AuthContext';
import type { Project } from '../types';

interface ProjectContextType {
  selectedProjectId: string | null;
  selectProject: (id: string) => void;
  clearSelection: () => void;
  projects: Project[];
  projectsLoading: boolean;
  refetchProjects: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'flowcraft_selected_project';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem(STORAGE_KEY, selectedProjectId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedProjectId]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await projectsApi.list();
      setProjects(res.data);
    } catch {
      // silent
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    } else {
      setProjects([]);
      setSelectedProjectId(null);
      setProjectsLoading(false);
    }
  }, [isAuthenticated, fetchProjects]);

  // Auto-select first project if none is selected, or reset if selected project is not in list
  useEffect(() => {
    if (projects.length > 0) {
      if (!selectedProjectId || !projects.some(p => p.id === selectedProjectId)) {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    return onDataChange((type) => {
      if (type === 'projects') fetchProjects();
    });
  }, [fetchProjects]);

  const selectProject = (id: string) => setSelectedProjectId(id);
  const clearSelection = () => setSelectedProjectId(null);

  return (
    <ProjectContext.Provider value={{
      selectedProjectId, selectProject, clearSelection,
      projects, projectsLoading, refetchProjects: fetchProjects,
    }}>
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
