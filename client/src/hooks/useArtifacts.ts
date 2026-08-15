import { useState, useEffect } from 'react';
import { artifactsApi } from '../services/api';
import { onDataChange } from '../utils/dataEvents';
import type { Artifact } from '../types';

export function useArtifacts(projectId?: string, type?: string, page: number = 1, pageSize: number = 20) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = () => setTrigger(t => t + 1);

  useEffect(() => {
    const fetchArtifacts = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (projectId) params.projectId = projectId;
        if (type) params.type = type;
        params.page = String(page);
        params.pageSize = String(pageSize);
        const response = await artifactsApi.list(params);
        setArtifacts(response.data as Artifact[]);
        setTotal((response as any).meta?.total || 0);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch artifacts';
        console.error('[useArtifacts]', msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchArtifacts();
  }, [projectId, type, page, pageSize, trigger]);

  useEffect(() => {
    return onDataChange((dataType) => {
      if (dataType === 'artifacts') refetch();
    });
  }, [projectId, type, page, pageSize]);

  return { artifacts, total, loading, error, refetch };
}
