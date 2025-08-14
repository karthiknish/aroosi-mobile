import { useEffect, useState } from 'react';
import { http } from '@services/http';

export type UseFeatureAccessReturn = {
  allowed: boolean;
  isLoading: boolean;
  error: string | null;
};

/**
 * useFeatureAccess
 * Checks entitlement for a given feature via cookie-auth API:
 *   GET /api/subscriptions/access?feature=FEATURE_KEY -> { allowed: boolean }
 * Returns { allowed, isLoading, error }
 */
export function useFeatureAccess(feature: string): UseFeatureAccessReturn {
  const [allowed, setAllowed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data } = await http.get<{ allowed: boolean }>(
          '/api/subscriptions/access',
          { params: { feature }, withCredentials: true }
        );
        if (!mounted) return;
        setAllowed(Boolean((data as any)?.allowed));
      } catch (e: any) {
        if (!mounted) return;
        setAllowed(false);
        setError(e?.response?.data?.error || e?.message || 'Unknown error');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [feature]);

  return { allowed, isLoading, error };
}