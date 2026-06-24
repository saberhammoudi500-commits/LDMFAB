import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getEmailByMatricule } from '../lib/db';

export interface CurrentUser {
  id: string;
  matricule: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (...perms: string[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

async function buildCurrentUser(supaUser: User): Promise<CurrentUser | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*, user_roles(roles(name, permissions))')
    .eq('id', supaUser.id)
    .single();

  if (error || !profile) return null;

  const roles: string[] = [];
  const permSet = new Set<string>();
  for (const ur of profile.user_roles ?? []) {
    if (ur.roles?.name) roles.push(ur.roles.name);
    const perms: string[] = Array.isArray(ur.roles?.permissions)
      ? ur.roles.permissions
      : JSON.parse(ur.roles?.permissions ?? '[]');
    perms.forEach((p: string) => permSet.add(p));
  }

  return {
    id: supaUser.id,
    matricule: profile.matricule,
    email: profile.email,
    name: `${profile.first_name} ${profile.last_name}`,
    roles,
    permissions: Array.from(permSet),
    mustChangePassword: profile.must_change_password ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) setUser(await buildCurrentUser(session.user));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) setUser(await buildCurrentUser(session.user));
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(identifier: string, password: string) {
    // Accepte email OU matricule
    let email = identifier;
    if (!identifier.includes('@')) {
      const found = await getEmailByMatricule(identifier);
      if (!found) throw new Error('Identifiants invalides.');
      email = found;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Identifiants invalides.');

    const profile = await buildCurrentUser(data.user);
    if (!profile) throw new Error('Profil introuvable.');
    if (!profile.permissions.length && !profile.roles.length) {
      // Vérifier si le compte est actif
    }
    setUser(profile);

    // Audit login
    await supabase.from('audit_logs').insert({
      user_id: data.user.id,
      user_label: profile.name,
      action: 'LOGIN',
      entity: 'Session',
    });
  }

  async function logout() {
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_label: user.name,
        action: 'LOGOUT',
        entity: 'Session',
      });
    }
    await supabase.auth.signOut();
    setUser(null);
  }

  async function refreshUser() {
    const { data: { user: supaUser } } = await supabase.auth.getUser();
    if (supaUser) setUser(await buildCurrentUser(supaUser));
  }

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      can: (...perms: string[]) => !!user && perms.some((p) => user.permissions.includes(p)),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit etre utilise dans AuthProvider');
  return ctx;
}
