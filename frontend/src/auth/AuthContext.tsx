import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAccessToken, setUnauthorizedHandler } from '../api/client';

export interface CurrentUser {
  id: string;
  matricule: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  mustChangePassword: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setMustChangePassword: (v: boolean) => void;
  can: (...perms: string[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem('ldmfab_access');
      localStorage.removeItem('ldmfab_refresh');
      setAccessToken(null);
      setUser(null);
    });

    const token = localStorage.getItem('ldmfab_access');
    if (token) {
      setAccessToken(token);
      api
        .get('/auth/me')
        .then((res) => {
          setUser({
            id: res.data.id,
            matricule: res.data.matricule,
            email: res.data.email,
            name: `${res.data.firstName} ${res.data.lastName}`,
            roles: res.data.roles,
            permissions: res.data.permissions,
          });
          setMustChangePassword(res.data.mustChangePassword);
        })
        .catch(() => {
          localStorage.removeItem('ldmfab_access');
          localStorage.removeItem('ldmfab_refresh');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(identifier: string, password: string) {
    const res = await api.post('/auth/login', { identifier, password });
    const { accessToken, refreshToken, user: u, mustChangePassword: mcp } = res.data;
    localStorage.setItem('ldmfab_access', accessToken);
    localStorage.setItem('ldmfab_refresh', refreshToken);
    setAccessToken(accessToken);
    setUser(u);
    setMustChangePassword(Boolean(mcp));
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('ldmfab_access');
    localStorage.removeItem('ldmfab_refresh');
    setAccessToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const res = await api.get('/auth/me');
    setUser({
      id: res.data.id,
      matricule: res.data.matricule,
      email: res.data.email,
      name: `${res.data.firstName} ${res.data.lastName}`,
      roles: res.data.roles,
      permissions: res.data.permissions,
    });
    setMustChangePassword(res.data.mustChangePassword);
  }

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      mustChangePassword,
      login,
      logout,
      refreshUser,
      setMustChangePassword,
      can: (...perms: string[]) => !!user && perms.some((p) => user.permissions.includes(p)),
    }),
    [user, loading, mustChangePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit etre utilise dans AuthProvider');
  return ctx;
}
