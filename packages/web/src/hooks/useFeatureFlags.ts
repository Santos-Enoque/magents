import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { FeatureFlags } from '@magents/shared/src/config/features';

export function useFeatureFlags() {
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/api/features');
      if (response.success) {
        setFeatures(response.data);
      } else {
        setError('Failed to load feature flags');
      }
    } catch (err) {
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const updateFeatures = async (updates: Partial<FeatureFlags>) => {
    try {
      const response = await apiService.put('/api/features', updates);
      if (response.success) {
        setFeatures(response.data);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update features:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  return {
    features,
    loading,
    error,
    refetch: fetchFeatures,
    updateFeatures
  };
}