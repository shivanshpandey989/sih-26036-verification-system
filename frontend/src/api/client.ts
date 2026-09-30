import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('ovs_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('ovs_token');
      localStorage.removeItem('ovs_user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/verify')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
