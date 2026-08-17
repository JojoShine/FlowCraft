import { useState, useEffect, useCallback, useRef } from 'react';
import { tasksApi } from '../services/api';
import { onDataChange } from '../utils/dataEvents';
import type { Task } from '../types';

export function useTasks(projectId?: string, column?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (projectId) params.projectId = projectId;
      if (column) params.column = column;
      const response = await tasksApi.list(params);
      setTasks(response.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch tasks';
      console.error('[useTasks]', msg);
      setError(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [projectId, column]);

  useEffect(() => {
    setTasks([]);
    setError(null);
    initialLoad.current = true;
  }, [projectId, column]);

  useEffect(() => {
    const isFirst = initialLoad.current;
    initialLoad.current = false;
    fetchTasks(!isFirst);
  }, [fetchTasks]);

  useEffect(() => {
    return onDataChange((type) => {
      if (type === 'tasks') fetchTasks(true);
    });
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: () => fetchTasks(true) };
}
