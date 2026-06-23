import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ShieldCheck,
  ScrollText,
  LogOut,
  FlaskConical,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, perm: 'dashboard:read' },
  { to: '/realisations', label: 'Realisations (OF)', icon: ClipboardList, perm: 'of:read' },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, perm: 'users:read' },
  { to: '/roles', label: 'Roles & droits', icon: ShieldCheck, perm: 'roles:read' },
  { to: '/audit', label: "Piste d'audit", icon: ScrollText, perm: 'audit:read' },
];

export function Layout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col bg-brand-900 text-white">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          <FlaskConical size={26} className="text-brand-100" />
          <div>
            <div className="text-lg font-bold leading-none">LDMFAB</div>
            <div className="text-[11px] text-brand-100/80">Fabrication pharmaceutique</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.filter((n) => can(n.perm)).map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-white/15 text-white' : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-xs">
          <div className="font-semibold">{user?.name}</div>
          <div className="text-brand-100/70">{user?.roles.join(', ')}</div>
          <span className="mt-1 inline-block rounded bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200">
            Conforme 21 CFR Part 11
          </span>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">
            Departement Fabrication — Suivi des realisations
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <div className="font-semibold text-slate-700">{user?.matricule}</div>
              <div className="text-slate-400">{user?.email}</div>
            </div>
            <button onClick={handleLogout} className="btn-secondary text-xs">
              <LogOut size={14} /> Deconnexion
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
