import axios from 'axios';
import type { Token, User } from '../types';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'printer-monitor-token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string | null) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      window.location.href = '/#/login';
    }
    return Promise.reject(error);
  },
);

export async function login(email: string, password: string): Promise<Token> {
  const response = await api.post('/auth/login', { email, password });
  const token = response.data.access_token;
  tokenStorage.set(token);
  return response.data;
}

export async function register(data: { email: string; password: string; full_name: string }): Promise<User> {
  const response = await api.post('/auth/register', data);
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>('/auth/me');
  return response.data;
}

export async function logout(): Promise<void> {
  tokenStorage.clear();
}
