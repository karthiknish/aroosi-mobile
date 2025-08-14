import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { API_BASE_URL } from '../constants';

const scope = 'auth.service';

// Sign in with email/password using Clerk
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[AUTH] signIn:start', { scope, correlationId, emailHash: Buffer.from(email).toString('base64url') });
  
  try {
    // Note: In a real implementation, you would use the Clerk hooks in a React component
    // For now, we'll simulate the API call to the web backend
    const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      console.info('[AUTH] signIn:response', { scope, correlationId, status: response.status, durationMs: Date.now() - startedAt });
      return { success: true };
    } else {
      const msg = data.error || data.message || 'Sign in failed';
      console.error('[AUTH] signIn:error', { scope, correlationId, status: response.status, message: msg, durationMs: Date.now() - startedAt });
      return { success: false, error: msg };
    }
  } catch (e: any) {
    const msg = e?.message || 'Network error';
    console.error('[AUTH] signIn:error', { scope, correlationId, message: msg, durationMs: Date.now() - startedAt });
    return { success: false, error: msg };
  }
}

// Sign up with email/password using Clerk
export async function signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[AUTH] signUp:start', { scope, correlationId, emailHash: Buffer.from(email).toString('base64url') });
  
  try {
    // Note: In a real implementation, you would use the Clerk hooks in a React component
    // For now, we'll simulate the API call to the web backend
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'success') {
      console.info('[AUTH] signUp:response', { scope, correlationId, status: response.status, durationMs: Date.now() - startedAt });
      return { success: true };
    } else {
      const msg = data.error || data.message || 'Sign up failed';
      console.error('[AUTH] signUp:error', { scope, correlationId, status: response.status, message: msg, durationMs: Date.now() - startedAt });
      return { success: false, error: msg };
    }
  } catch (e: any) {
    const msg = e?.message || 'Network error';
    console.error('[AUTH] signUp:error', { scope, correlationId, message: msg, durationMs: Date.now() - startedAt });
    return { success: false, error: msg };
  }
}

// Sign in with Google ID token using Clerk
export async function signInWithGoogleIdToken(idToken: string): Promise<{ success: boolean; error?: string }> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[AUTH] google:start', { scope, correlationId });
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      console.info('[AUTH] google:response', { scope, correlationId, status: response.status, durationMs: Date.now() - startedAt });
      return { success: true };
    } else {
      const msg = data.error || data.message || 'Google sign-in failed';
      console.error('[AUTH] google:error', { scope, correlationId, status: response.status, message: msg, durationMs: Date.now() - startedAt });
      return { success: false, error: msg };
    }
  } catch (e: any) {
    const msg = e?.message || 'Network error';
    console.error('[AUTH] google:error', { scope, correlationId, message: msg, durationMs: Date.now() - startedAt });
    return { success: false, error: msg };
  }
}

// Request password reset
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  console.info('[AUTH] forgot:start', { scope, correlationId, emailHash: Buffer.from(email).toString('base64url') });
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.info('[AUTH] forgot:success', { scope, correlationId });
      return { success: true };
    } else {
      const msg = data.error || data.message || 'Failed to request password reset';
      console.error('[AUTH] forgot:error', { scope, correlationId, status: response.status, message: msg });
      return { success: false, error: msg };
    }
  } catch (e: any) {
    const msg = e?.message || 'Network error';
    console.error('[AUTH] forgot:error', { scope, correlationId, message: msg });
    return { success: false, error: msg };
  }
}

// Reset password
export async function resetPassword(token: string, password: string): Promise<{ success: boolean; error?: string }> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  console.info('[AUTH] reset:start', { scope, correlationId });
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.info('[AUTH] reset:success', { scope, correlationId });
      return { success: true };
    } else {
      const msg = data.error || data.message || 'Failed to reset password';
      console.error('[AUTH] reset:error', { scope, correlationId, status: response.status, message: msg });
      return { success: false, error: msg };
    }
  } catch (e: any) {
    const msg = e?.message || 'Network error';
    console.error('[AUTH] reset:error', { scope, correlationId, message: msg });
    return { success: false, error: msg };
  }
}

// Get current session user
export async function getSession<T = any>(): Promise<T | null> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[AUTH] session:get:start', { scope, correlationId });
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const envelope: any = data;
      const user = envelope && typeof envelope === 'object' && 'profile' in envelope ? envelope.profile : envelope;
      console.info('[AUTH] session:get:success', { scope, correlationId, hasUser: !!user, durationMs: Date.now() - startedAt });
      return user ?? null;
    } else {
      console.warn('[AUTH] session:get:error', { scope, correlationId, status: response.status, durationMs: Date.now() - startedAt });
      return null;
    }
  } catch (e: any) {
    console.warn('[AUTH] session:get:error', { scope, correlationId, message: e?.message || String(e), durationMs: Date.now() - startedAt });
    return null;
  }
}

// Sign out
export async function signOut(): Promise<void> {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  console.info('[AUTH] signOut:start', { scope, correlationId });
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (response.ok) {
      console.info('[AUTH] signOut:success', { scope, correlationId, durationMs: Date.now() - startedAt });
    } else {
      console.warn('[AUTH] signOut:error', { scope, correlationId, status: response.status, durationMs: Date.now() - startedAt });
    }
  } catch (e: any) {
    console.warn('[AUTH] signOut:error', { scope, correlationId, message: e?.message || String(e), durationMs: Date.now() - startedAt });
  }
}