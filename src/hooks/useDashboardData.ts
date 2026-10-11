import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardData, type DashboardData } from '../services/dashboardService';

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchDashboardData();
      setData(result);
    } catch (err: any) {
      console.error('Error in useDashboardData:', err);
      setError(err?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Auto-refresh data every 60 seconds
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refresh: loadData,
  };
}
