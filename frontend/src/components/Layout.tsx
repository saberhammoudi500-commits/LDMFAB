import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ShieldCheck,
  ScrollText,
  LogOut,
  FlaskConical,
  Database,
  BarChart3,
  Factory,
  PackageCheck,
  FileCheck2,
  UserCog,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useState } from 'react';

type NavItem = {
  to?: string;
  label: string;
  icon: React.ElementType;
  perm?: string;
  children?: NavItem[];
};

const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, perm: 'dashboard:read' },
  {
    label: 'Référentiels', icon: Database, perm: 'ref:read',
    children: [
      { to: '/referentiels/donneurs', label: 'Donneurs d\'ordre', icon: Database },
      { to: '/referentiels/produits', label: 'Produits', icon: Database },
      { to: '/referentiels/equipements', label: 'Équipements', icon: Factory },
      { to: '/referentiels/cadences', label: 'Cadences', icon: BarChart3 },
      { to: '/referentiels/pcsu', label: 'PCSU / Valorisation', icon: BarChart3 },
    ],
  },
  { to: '/pdp', label: 'Plan Directeur (PDP)', icon: BarChart3, perm: 'pdp:read' },
  { to: '/fabrication', label: 'Fabrication (OF)', icon: Factory, perm: 'of:read' },
  { to: '/conditionnement', label: 'Conditionnement', icon: PackageCheck, perm: 'cndt:read' },
  { to: '/ddl', label: 'Dossiers de Lot', icon: FileCheck2, perm: 'ddl:read' },
  { to: '/encours', label: 'En-cours / Disponibilité', icon: PackageCheck, perm: 'of:read' },
  { to: '/effectifs', label: 'Effectifs (HC)', icon: UserCog, perm: 'hc:read' },
  { to: '/realisations', label: 'Réalisations (legacy)', icon: ClipboardList, perm: 'of:read' },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, perm: 'users:read' },
  { to: '/roles', label: 'Rôles & droits', icon: ShieldCheck, perm: 'roles:read' },
  { to: '/audit', label: "Piste d'audit", icon: ScrollText, perm: 'audit:read' },
];

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const { can } = useAuth();

  if (item.to) {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
            isActive ? 'bg-white/15 text-white' : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
          }`
        }
      >
        <item.icon size={18} />
        {item.label}
      </NavLink>
    );
  }

  if (!item.children) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-brand-100/80 hover:bg-white/10 hover:text-white transition"
      >
        <item.icon size={18} />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
          {item.children.filter((c) => !c.perm || can(c.perm)).map((child) => (
            <NavGroup key={child.to} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col bg-brand-900 text-white overflow-y-auto">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          <FlaskConical size={26} className="text-brand-100" />
          <div>
            <div className="text-lg font-bold leading-none">LDMFAB</div>
            <div className="text-[11px] text-brand-100/80">Fabrication pharmaceutique</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => (
            <NavGroup key={n.to ?? n.label} item={n} />
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-xs">
          <div className="font-semibold">{user?.name}</div>
          <div className="text-brand-100/70">{user?.roles.join(', ')}</div>
          <span className="mt-1 inline-block rounded bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200">
            BPF / 21 CFR Part 11
          </span>
        </div>
        <div className="border-t border-white/10 px-4 py-3">
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-brand-100/70 hover:text-white transition">
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">
            Département Fabrication — Pilotage de la production
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <div className="font-semibold text-slate-700">{user?.matricule}</div>
              <div className="text-slate-400">{user?.email}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
