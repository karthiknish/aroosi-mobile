import axios from 'axios';
import { API_BASE_URL } from '../constants';

// Shared Axios instance configured for token-based auth
export const http = axios.create({
  baseURL: API_BASE_URL, // e.g., https://aroosi.app
  timeout: 15000,
});

// Add a request interceptor to include the auth token
http.interceptors.request.use(
  async (config) => {
    // In a real implementation, you would get the token from Clerk
    // For now, we'll leave this as a placeholder
    try {
      // This would be implemented when we have access to the Clerk auth context
      // const token = await getToken(); // This would come from Clerk
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`;
      // }
    } catch (error) {
      console.warn('Failed to get auth token', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      // In a real implementation, you would refresh the token here
      // For now, we'll just reject the error
    }
    return Promise.reject(error);
  }
);