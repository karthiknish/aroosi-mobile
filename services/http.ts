import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { getAuthToken, getFreshAuthToken, applyAuthHeader } from "./authToken";

// Shared Axios instance configured for token-based auth
export const http = axios.create({
  baseURL: API_BASE_URL, // e.g., https://aroosi.app
  timeout: 15000,
});

// Add a request interceptor to include the auth token
http.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      // Axios may define headers as AxiosHeaders; use set when available.
      if (config.headers && typeof (config.headers as any).set === "function") {
        const headersObj: any = config.headers;
        if (token) headersObj.set("Authorization", `Bearer ${token}`);
      } else {
        const headers: Record<string, any> = (config.headers as any) || {};
        applyAuthHeader(headers, token);
        config.headers = headers as any;
      }
    } catch (error) {
      console.warn("Failed to get auth token", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 errors
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config as any;
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const fresh = await getFreshAuthToken();
        if (fresh) {
          if (!original.headers) original.headers = {};
          applyAuthHeader(original.headers, fresh);
          return http(original);
        }
      } catch (e) {
        console.warn("Token refresh failed", e);
      }
    }
    return Promise.reject(error);
  }
);