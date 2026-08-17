import { useState, useEffect, useCallback, useRef } from 'react';
import { projectsApi } from '../services/api';
import { onDataChange } from '../utils/dataEvents';
import type { Project } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const fetchProjects = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await projectsApi.list();
      setProjects(response.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch projects';
      console.error('[useProjects]', msg);
      setError(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isFirst = initialLoad.current;
    initialLoad.current = false;
    fetchProjects(!isFirst);
  }, [fetchProjects]);

  useEffect(() => {
    return onDataChange((type) => {
      if (type === 'projects') fetchProjects(true);
    });
  }, [fetchProjects]);

  return { projects, loading, error, refetch: () => fetchProjects(true) };
}

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const fetchProject = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const response = await projectsApi.get(id);
      setProject(response.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch project';
      console.error(`[useProject] id=${id}`, msg);
      setError(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const isFirst = initialLoad.current;
    initialLoad.current = false;
    fetchProject(!isFirst);
  }, [fetchProject]);

  useEffect(() => {
    return onDataChange((type) => {
      if (type === 'projects') fetchProject(true);
    });
  }, [fetchProject]);

  return { project, loading, error, refetch: () => fetchProject(true) };
}
