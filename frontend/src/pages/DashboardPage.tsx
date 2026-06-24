import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { ClipboardCheck, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { fetchDashboardStats } from '../lib/db';
import { supabase } from '../lib/supabase';

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
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats()
      .then(async (s) => {
        // Calculs complémentaires
        const { data: statuts } = await supabase
          .from('ordres_fabrication')
          .select('workflow_status')
          .is('deleted_at', null);

        const { data: aqls } = await supabase
          .from('ordres_fabrication')
          .select('aql')
          .is('deleted_at', null)
          .not('aql', 'is', null);

        const statutCount: Record<string, number> = {};
        (statuts ?? []).forEach((r: any) => { statutCount[r.workflow_status] = (statutCount[r.workflow_status] ?? 0) + 1; });

        const aqlCount: Record<string, number> = {};
        (aqls ?? []).forEach((r: any) => { if (r.aql) aqlCount[r.aql] = (aqlCount[r.aql] ?? 0) + 1; });

        const LABELS: Record<string, string> = { CREATION: 'Création', EN_COURS: 'En cours', FABRICATION_TERMINEE: 'Fab. terminée', VERIFICATION: 'Vérification', RECTIFICATION: 'Rectification', CLOTURE: 'Clôturé' };
        const repartitionStatut = Object.entries(statutCount).map(([k, v]) => ({ statut: k, label: LABELS[k] ?? k, count: v }));
        const repartitionAql = Object.entries(aqlCount).map(([k, v]) => ({ aql: k, count: v }));

        const rends = s.rendements.map((r: any) => r.rendement_total).filter(Boolean);
        const rendementMoyen = rends.length > 0 ? Math.round((rends.reduce((a: number, b: number) => a + b, 0) / rends.length) * 100) / 100 : null;
        const conformes = aqlCount['CONFORME'] ?? 0;
        const total = Object.values(aqlCount).reduce((a, b) => a + b, 0);
        const tauxConformite = total > 0 ? Math.round((conformes / total) * 10000) / 100 : null;

        setStats({ ...s, repartitionStatut, repartitionAql, rendementMoyen, tauxConformite, retardValidite: 0 });
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="rounded bg-red-50 p-4 text-red-700">{error}</div>;
  if (!stats) return <div className="text-slate-500">Chargement…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<ClipboardCheck className="text-brand-700" />} accent="bg-brand-50" label="Ordres de fabrication" value={String(stats.totalOrdres)} />
        <Kpi icon={<TrendingUp className="text-green-700" />} accent="bg-green-50" label="Rendement moyen" value={stats.rendementMoyen !== null ? `${stats.rendementMoyen} %` : '—'} />
        <Kpi icon={<ShieldCheck className="text-emerald-700" />} accent="bg-emerald-50" label="Taux de conformite AQL" value={stats.tauxConformite !== null ? `${stats.tauxConformite} %` : '—'} />
        <Kpi icon={<AlertTriangle className="text-amber-600" />} accent="bg-amber-50" label="Non conformes" value={String(stats.nonConformes)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Repartition par statut</h2>
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
                {stats.repartitionAql.map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            {stats.repartitionAql.map((a: any, i: number) => (
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
