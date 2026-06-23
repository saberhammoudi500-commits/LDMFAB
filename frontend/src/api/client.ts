import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.request.use((cfg) => {
  if (accessToken) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  return cfg;
});

// Rafraichissement automatique du token sur 401
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const stored = localStorage.getItem('ldmfab_refresh');

    if (status === 401 && stored && !original._retry) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = axios
            .post('/api/auth/refresh', { refreshToken: stored })
            .then((res) => res.data.accessToken as string)
            .catch(() => null)
            .finally(() => {
              refreshing = null;
            });
        }
        const newToken = await refreshing;
        if (newToken) {
          setAccessToken(newToken);
          localStorage.setItem('ldmfab_access', newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        /* ignore */
      }
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as any;
    if (data?.details && Array.isArray(data.details)) {
      return `${data.error ?? 'Erreur'} : ${data.details.map((d: any) => d.message ?? d).join(', ')}`;
    }
    return data?.error ?? err.message;
  }
  return 'Erreur inattendue.';
}
