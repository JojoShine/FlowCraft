import { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../services/api';
import { onDataChange } from '../utils/dataEvents';
import type { Project } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await projectsApi.list();
      setProjects(response.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch projects';
      console.error('[useProjects]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    return onDataChange((type) => {
      if (type === 'projects') fetchProjects();
    });
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await projectsApi.get(id);
      setProject(response.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch project';
      console.error(`[useProject] id=${id}`, msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    return onDataChange((type) => {
      if (type === 'projects') fetchProject();
    });
  }, [fetchProject]);

  return { project, loading, error, refetch: fetchProject };
}
