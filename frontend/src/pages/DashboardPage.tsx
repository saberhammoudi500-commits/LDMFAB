import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import {
  ClipboardCheck, TrendingUp, AlertTriangle, FileCheck2,
  Package, BarChart3, Clock, CheckCircle,
} from 'lucide-react';
import { api, apiError } from '../api/client';

interface Stats {
  totalOF: number;
  ofEnCours: number;
  ofSfDeclares: number;
  ofConditionnes: number;
  ofClotures: number;
  ofPerimesProche: number;
  ofPerimes: number;
  ddlEnAttente: number;
  rendementMoyen: number | null;
  rendementsMoyensParPhase: { phase: string; rendementMoyen: number | null; count: number }[];
  tauxCndtMoyen: number | null;
  tauxRealisationFab: number | null;
  tauxRealisationCndt: number | null;
  gapCA: number | null;
  repartitionStatut: { statut: string; count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  RECU: 'Recu', EN_COURS: 'En cours', SF_DECLARE: 'SF Declare',
  CONDITIONNE: 'Conditionne', CLOTURE: 'Cloture',
};

const PIE_COLORS = ['#94a3b8', '#2563eb', '#f59e0b', '#8b5cf6', '#16a34a'];

function Kpi({ icon, label, value, accent, sub }: {
  icon: React.ReactNode; label: string; value: string; accent: string; sub?: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`rounded-lg p-3 ${accent}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then((r) => setStats(r.data)).catch((e) => setError(apiError(e)));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;
  if (!stats) return <div className="text-slate-500">Chargement du tableau de bord...</div>;

  const pieData = stats.repartitionStatut.map((s) => ({
    name: STATUS_LABELS[s.statut] ?? s.statut,
    value: s.count,
  }));

  const phaseData = stats.rendementsMoyensParPhase
    .filter((p) => p.rendementMoyen != null)
    .map((p) => ({
      name: p.phase,
      'Rdt (%)': Math.round(p.rendementMoyen! * 10) / 10,
      Lots: p.count,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Tableau de bord -- Fabrication</h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Kpi
          icon={<ClipboardCheck size={22} className="text-blue-600" />}
          label="Total OF" value={stats.totalOF.toString()}
          accent="bg-blue-50" sub={`${stats.ofEnCours} en cours`}
        />
        <Kpi
          icon={<Package size={22} className="text-amber-600" />}
          label="SF Declares (en-cours)" value={stats.ofSfDeclares.toString()}
          accent="bg-amber-50" sub="Attente conditionnement"
        />
        <Kpi
          icon={<TrendingUp size={22} className="text-green-600" />}
          label="Rendement moyen"
          value={stats.rendementMoyen != null ? `${stats.rendementMoyen.toFixed(1)}%` : '--'}
          accent="bg-green-50"
          sub={`Cndt: ${stats.tauxCndtMoyen?.toFixed(1) ?? '--'}%`}
        />
        <Kpi
          icon={<CheckCircle size={22} className="text-emerald-600" />}
          label="OF Clotures" value={stats.ofClotures.toString()}
          accent="bg-emerald-50"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className={`card p-4 flex items-center gap-3 ${stats.ofPerimes > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <AlertTriangle size={24} className={stats.ofPerimes > 0 ? 'text-red-500' : 'text-slate-300'} />
          <div>
            <div className={`text-2xl font-bold ${stats.ofPerimes > 0 ? 'text-red-700' : 'text-slate-400'}`}>{stats.ofPerimes}</div>
            <div className="text-xs text-slate-500">OF perimes (non clotures)</div>
          </div>
        </div>
        <div className={`card p-4 flex items-center gap-3 ${stats.ofPerimesProche > 0 ? 'border-amber-200 bg-amber-50' : ''}`}>
          <Clock size={24} className={stats.ofPerimesProche > 0 ? 'text-amber-500' : 'text-slate-300'} />
          <div>
            <div className={`text-2xl font-bold ${stats.ofPerimesProche > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{stats.ofPerimesProche}</div>
            <div className="text-xs text-slate-500">OF perimant dans 30j</div>
          </div>
        </div>
        <div className={`card p-4 flex items-center gap-3 ${stats.ddlEnAttente > 0 ? 'border-orange-200 bg-orange-50' : ''}`}>
          <FileCheck2 size={24} className={stats.ddlEnAttente > 0 ? 'text-orange-500' : 'text-slate-300'} />
          <div>
            <div className={`text-2xl font-bold ${stats.ddlEnAttente > 0 ? 'text-orange-700' : 'text-slate-400'}`}>{stats.ddlEnAttente}</div>
            <div className="text-xs text-slate-500">DDL en attente</div>
          </div>
        </div>
      </div>

      {(stats.tauxRealisationFab != null || stats.tauxRealisationCndt != null) && (
        <div className="card p-5">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} /> PDP -- Mois courant
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-slate-400 mb-1">Taux realisation Fabrication</div>
              <div className={`text-3xl font-bold ${(stats.tauxRealisationFab ?? 0) >= 100 ? 'text-green-600' : (stats.tauxRealisationFab ?? 0) >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                {stats.tauxRealisationFab?.toFixed(1) ?? '--'}%
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-2">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.tauxRealisationFab ?? 0)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Taux realisation Conditionnement</div>
              <div className={`text-3xl font-bold ${(stats.tauxRealisationCndt ?? 0) >= 100 ? 'text-green-600' : (stats.tauxRealisationCndt ?? 0) >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                {stats.tauxRealisationCndt?.toFixed(1) ?? '--'}%
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-2">
                <div
                  className="h-2 bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.tauxRealisationCndt ?? 0)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">GAP CA (Realise - Plan)</div>
              <div className={`text-3xl font-bold ${(stats.gapCA ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.gapCA != null
                  ? `${stats.gapCA >= 0 ? '+' : ''}${stats.gapCA.toLocaleString()}`
                  : '--'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3">Repartition OF par statut</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%" outerRadius={80}
                dataKey="value"
                label={({ name, percent }: { name: string; percent: number }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {phaseData.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold mb-3">Rendements par phase (annee en cours)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={phaseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[80, 100]} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="Rdt (%)" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
