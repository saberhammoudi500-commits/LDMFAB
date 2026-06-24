import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute({ children, perm }: { children: ReactNode; perm?: string }) {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">Chargement…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/changer-mot-de-passe" replace />;
  if (perm && !can(perm)) {
    return (
      <div className="p-10 text-center text-slate-500">
        Acces refuse : vous n'avez pas la permission requise.
      </div>
    );
  }
  return <>{children}</>;
}
