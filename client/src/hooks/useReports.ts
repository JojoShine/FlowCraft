import { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../services/api';
import type { Report } from '../types';

interface UseReportsParams {
  projectId?: string;
  type?: string;
  year?: number;
  month?: number;
}

export function useReports(params?: UseReportsParams) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reportsApi.list(params);
      setReports(response.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch reports';
      console.error('[useReports]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [params?.projectId, params?.type, params?.year, params?.month]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, error, refetch: fetchReports };
}
