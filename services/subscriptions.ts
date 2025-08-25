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

// Unified plan retrieval: web app currently renders plans statically; if the
// backend provides /api/subscriptions/plans we use it, else fall back to static.
const STATIC_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Browse limited profiles',
      'Send limited likes',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 1499, // minor units (e.g. GBP £14.99)
    popular: true,
    features: [
      'Unlimited likes',
      'Initiate chats',
      'Advanced filters (basic)',
    ],
  },
  {
    id: 'premiumPlus',
    name: 'Premium Plus',
    price: 3999,
    features: [
      'All Premium features',
      'Profile boosts',
      'See profile viewers',
      'Spotlight badge',
      'Incognito mode',
    ],
  },
];

export async function getPlans(): Promise<Plan[]> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[SUBS] plans:load:start', { scope, correlationId });
  try {
    const { data } = await http.get<PlansResponse>('/api/subscriptions/plans', { withCredentials: true });
    const plans = (data as any)?.plans ?? data ?? [];
    if (!Array.isArray(plans) || plans.length === 0)
      throw new Error("Empty plans response");
    console.info("[SUBS] plans:load:success", {
      scope,
      correlationId,
      count: plans.length,
      durationMs: Date.now() - startedAt,
    });
    return plans;
  } catch (e: any) {
    const status = e?.response?.status;
    console.warn("[SUBS] plans:load:fallback", {
      scope,
      correlationId,
      status,
      message: e?.response?.data?.error || e?.message,
    });
    // Fallback to static definitions (alignment with web static offerings)
    return STATIC_PLANS;
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

// POST /api/stripe/checkout { planId } -> returns { url } (platform passed for analytics if backend supports)
export async function createCheckoutSession(planId: string, platform: 'ios' | 'android'): Promise<{ url: string }> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[SUBS] checkout:start', { scope, correlationId, planId, platform });
  try {
    const { data } = await http.post<{ url: string }>(
      "/api/stripe/checkout",
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

// POST /api/stripe/portal -> { url }
export async function getBillingPortalUrl(): Promise<{ url: string }> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[SUBS] portal:start', { scope, correlationId });
  try {
    // Some backends use POST for portal session creation (Stripe best practice)
    const { data } = await http.post<{ url: string }>(
      "/api/stripe/portal",
      {},
      { withCredentials: true }
    );
    const url = (data as any)?.url;
    console.info("[SUBS] portal:success", {
      scope,
      correlationId,
      hasUrl: !!url,
      durationMs: Date.now() - startedAt,
    });
    return { url };
  } catch (e: any) {
    const status = e?.response?.status;
    console.error('[SUBS] portal:error', { scope, correlationId, status, message: e?.response?.data?.error || e?.message });
    throw e;
  }
}