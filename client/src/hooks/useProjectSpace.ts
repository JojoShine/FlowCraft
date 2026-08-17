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

  useEffect(() => {
    setProject(null);
    setTasks([]);
    setActivePhaseId('');
    setError(null);
  }, [id]);

  const fetchSummary = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setActivePhaseId('');
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
      setLoading(false);
    }
  }, [id]);

  const fetchPhaseTasks = useCallback(async (phaseId: string) => {
    if (!phaseId) return;
    const fetchId = ++fetchIdRef.current;
    setLoadingTasks(true);
    try {
      const res = await tasksApi.listByPhase(phaseId);
      if (fetchId === fetchIdRef.current) {
        setTasks(res.data as Task[]);
      }
    } catch {
      if (fetchId === fetchIdRef.current) setTasks([]);
    } finally {
      if (fetchId === fetchIdRef.current) setLoadingTasks(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (activePhaseId) fetchPhaseTasks(activePhaseId);
  }, [activePhaseId, fetchPhaseTasks]);

  useEffect(() => {
    return onDataChange((type) => {
      if (type === 'projects') fetchSummary();
      if (type === 'tasks' && activePhaseId) fetchPhaseTasks(activePhaseId);
    });
  }, [fetchSummary, fetchPhaseTasks, activePhaseId]);

  const refetch = useCallback(() => {
    fetchSummary();
    if (activePhaseId) fetchPhaseTasks(activePhaseId);
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
