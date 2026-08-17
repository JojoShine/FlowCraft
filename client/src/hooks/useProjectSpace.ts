import { useState, useEffect, useCallback, useRef } from 'react';
import { projectsApi, tasksApi } from '../services/api';
import { onDataChange } from '../utils/dataEvents';
import type { Task } from '../types';

interface PhaseWithCount {
  id: string;
  name: string;
  order: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  _count: { tasks: number };
}

interface ProjectSummary {
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: string;
  progress: number | null;
  startDate: string | null;
  endDate: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  phases: PhaseWithCount[];
}

export function useProjectSpace(id: string) {
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<string>('');
  const fetchIdRef = useRef(0);
  const initialLoad = useRef(true);

  useEffect(() => {
    setProject(null);
    setTasks([]);
    setActivePhaseId('');
    setError(null);
    initialLoad.current = true;
  }, [id]);

  const fetchSummary = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) {
      setLoading(true);
      setActivePhaseId('');
    }
    try {
      const res = await projectsApi.getSummary(id);
      const data = res.data as ProjectSummary;
      setProject(data);
      if (data.phases?.length) {
        const statusToPhaseName: Record<string, string> = {
          discovery: '项目线索',
          research: '调研梳理',
          design: '方案设计',
          prototype: '原型设计',
          development: '开发实施',
          testing: '测试交付',
          completed: '复盘归档',
        };
        const targetName = statusToPhaseName[data.status];
        const match = targetName ? data.phases.find(p => p.name === targetName) : null;
        setActivePhaseId(match?.id || data.phases[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  const fetchPhaseTasks = useCallback(async (phaseId: string, silent = false) => {
    if (!phaseId) return;
    const fetchId = ++fetchIdRef.current;
    if (!silent) setLoadingTasks(true);
    try {
      const res = await tasksApi.listByPhase(phaseId);
      if (fetchId === fetchIdRef.current) {
        setTasks(res.data as Task[]);
      }
    } catch {
      if (fetchId === fetchIdRef.current) setTasks([]);
    } finally {
      if (fetchId === fetchIdRef.current && !silent) setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    const isFirst = initialLoad.current;
    initialLoad.current = false;
    fetchSummary(!isFirst);
  }, [fetchSummary]);

  useEffect(() => {
    if (activePhaseId) fetchPhaseTasks(activePhaseId);
  }, [activePhaseId, fetchPhaseTasks]);

  useEffect(() => {
    return onDataChange((type) => {
      if (type === 'projects') fetchSummary(true);
      if (type === 'tasks' && activePhaseId) fetchPhaseTasks(activePhaseId, true);
    });
  }, [fetchSummary, fetchPhaseTasks, activePhaseId]);

  const refetch = useCallback(() => {
    fetchSummary(true);
    if (activePhaseId) fetchPhaseTasks(activePhaseId, true);
  }, [fetchSummary, fetchPhaseTasks, activePhaseId]);

  return {
    project,
    tasks,
    phases: project?.phases || [],
    loading,
    loadingTasks,
    error,
    activePhaseId,
    setActivePhaseId,
    refetch,
  };
}
