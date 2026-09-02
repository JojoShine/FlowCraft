import { useState, useEffect, useCallback, useRef } from 'react';
import { tasksApi } from '../services/api';
import { onDataChange } from '../utils/dataEvents';
import type { Task } from '../types';

export function useTasks(projectId?: string, column?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoad = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTasks = useCallback(async (silent = false) => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!silent) setLoading(true);
    try {
      const params: Record<string, string> = { projectId };
      if (column) params.column = column;
      const response = await tasksApi.list(params, controller.signal);
      setTasks(response.data);
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Failed to fetch tasks';
      console.error('[useTasks]', msg);
      setError(msg);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
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

  useEffect(() => () => abortRef.current?.abort(), []);

  return { tasks, loading, error, refetch: () => fetchTasks(true) };
}
