import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { ClipboardCheck, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api, apiError } from '../api/client';

interface Stats {
  totalOF: number;
  ofClotures: number;
  ofEnCours: number;
  rendementMoyen: number | null;
  tauxConformite: number | null;
  retardValidite: number;
  repartitionStatut: { statut: string; label: string; count: number }[];
  repartitionAql: { aql: string; count: number }[];
}

const PIE_COLORS = ['#16a34a', '#dc2626', '#94a3b8', '#f59e0b'];

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`rounded-lg p-3 ${accent}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((r) => setStats(r.data))
      .catch((e) => setError(apiError(e)));
  }, []);

  if (error) return <div className="rounded bg-red-50 p-4 text-red-700">{error}</div>;
  if (!stats) return <div className="text-slate-500">Chargement…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<ClipboardCheck className="text-brand-700" />} accent="bg-brand-50" label="Ordres de fabrication" value={String(stats.totalOF)} />
        <Kpi icon={<TrendingUp className="text-green-700" />} accent="bg-green-50" label="Rendement moyen" value={stats.rendementMoyen !== null ? `${stats.rendementMoyen} %` : '—'} />
        <Kpi icon={<ShieldCheck className="text-emerald-700" />} accent="bg-emerald-50" label="Taux de conformite AQL" value={stats.tauxConformite !== null ? `${stats.tauxConformite} %` : '—'} />
        <Kpi icon={<AlertTriangle className="text-amber-600" />} accent="bg-amber-50" label="OF en retard de validite" value={String(stats.retardValidite)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Repartition par statut de workflow</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.repartitionStatut}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Nombre d'OF" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Conformite (AQL)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.repartitionAql} dataKey="count" nameKey="aql" cx="50%" cy="50%" outerRadius={90} label>
                {stats.repartitionAql.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            {stats.repartitionAql.map((a, i) => (
              <span key={a.aql} className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {a.aql} ({a.count})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
