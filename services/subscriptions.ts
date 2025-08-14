import { http } from './http';

export type Plan = {
  id: string;
  name: string;
  price: number;
  priceId?: string;
  features?: string[];
  popular?: boolean;
};

export type PlansResponse = {
  plans: Plan[];
};

const scope = 'subs.service';

// GET /api/subscriptions/plans
export async function getPlans(): Promise<Plan[]> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[SUBS] plans:load:start', { scope, correlationId });
  try {
    const { data } = await http.get<PlansResponse>('/api/subscriptions/plans', { withCredentials: true });
    const plans = (data as any)?.plans ?? data ?? [];
    console.info('[SUBS] plans:load:success', { scope, correlationId, count: Array.isArray(plans) ? plans.length : 0, durationMs: Date.now() - startedAt });
    return plans;
  } catch (e: any) {
    const status = e?.response?.status;
    console.error('[SUBS] plans:load:error', { scope, correlationId, status, message: e?.response?.data?.error || e?.message });
    throw e;
  }
}

// GET /api/subscriptions/access?feature=FEATURE_KEY
export async function checkAccess(feature: string): Promise<boolean> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[SUBS] access:check:start', { scope, correlationId, feature });
  try {
    const { data } = await http.get<{ allowed: boolean }>(`/api/subscriptions/access`, {
      params: { feature },
      withCredentials: true,
    });
    const allowed = (data as any)?.allowed ?? false;
    console.info('[SUBS] access:check:success', { scope, correlationId, feature, allowed, durationMs: Date.now() - startedAt });
    return allowed;
  } catch (e: any) {
    const status = e?.response?.status;
    console.warn('[SUBS] access:check:error', { scope, correlationId, feature, status, message: e?.response?.data?.error || e?.message });
    // Fail-safe: deny on error
    return false;
  }
}

// POST /api/payments/checkout { planId, platform } -> returns { url }
export async function createCheckoutSession(planId: string, platform: 'ios' | 'android'): Promise<{ url: string }> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[SUBS] checkout:start', { scope, correlationId, planId, platform });
  try {
    const { data } = await http.post<{ url: string }>(
      '/api/payments/checkout',
      { planId, platform },
      { withCredentials: true }
    );
    const url = (data as any)?.url;
    console.info('[SUBS] checkout:success', { scope, correlationId, hasUrl: !!url, durationMs: Date.now() - startedAt });
    return { url };
  } catch (e: any) {
    const status = e?.response?.status;
    console.error('[SUBS] checkout:error', { scope, correlationId, status, message: e?.response?.data?.error || e?.message });
    throw e;
  }
}

// GET /api/subscriptions/portal -> { url }
export async function getBillingPortalUrl(): Promise<{ url: string }> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[SUBS] portal:start', { scope, correlationId });
  try {
    const { data } = await http.get<{ url: string }>('/api/subscriptions/portal', { withCredentials: true });
    const url = (data as any)?.url;
    console.info('[SUBS] portal:success', { scope, correlationId, hasUrl: !!url, durationMs: Date.now() - startedAt });
    return { url };
  } catch (e: any) {
    const status = e?.response?.status;
    console.error('[SUBS] portal:error', { scope, correlationId, status, message: e?.response?.data?.error || e?.message });
    throw e;
  }
}