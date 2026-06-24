import { useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

interface PdpLigne {
  id: string;
  planQteFab: number; planQteCndt: number; planValeur: number;
  realiseFab: number; realiseCndt: number; realiseValeur: number;
  tauxFab: number | null; tauxCndt: number | null; gapValeur: number;
  produit: { codePF: string; designation: string; formeGalenique: { nom: string } };
  donneurOrdre: { nom: string };
}

interface PdpMois {
  id: string; annee: number; mois: number;
  lignes: PdpLigne[];
}

interface YtdLigne {
  produit: { codePF: string; designation: string };
  donneurOrdre: { nom: string };
  planFabTotal: number; realiseFabTotal: number;
  planCndtTotal: number; realiseCndtTotal: number;
  planValeurTotal: number; realiseValeurTotal: number;
  tauxFab: number | null; tauxCndt: number | null; gapValeur: number;
}

export function PdpPage() {
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [view, setView] = useState<'mois' | 'ytd'>('mois');
  const [pdp, setPdp] = useState<PdpMois | null>(null);
  const [ytd, setYtd] = useState<{ annee: number; lignes: YtdLigne[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const req = view === 'mois'
      ? api.get(`/pdp/${annee}/${mois}`).then((r) => { setPdp(r.data); setYtd(null); })
      : api.get(`/pdp/ytd/${annee}`).then((r) => { setYtd(r.data); setPdp(null); });
    req.catch((e) => { if (e.response?.status !== 404) setError(apiError(e)); else { setPdp(null); setYtd(null); } })
       .finally(() => setLoading(false));
  }, [annee, mois, view]);

  // Données graphique mensuel (vue YTD)
  const chartData = ytd ? MOIS_LABELS.map((label, i) => {
    const m = i + 1;
    const sum = (key: string) => ytd.lignes.reduce((s, l) => s + ((l as any).mois?.[m]?.[key] ?? 0), 0);
    return {
      name: label,
      'Plan Fab': Math.round(sum('planFab')),
      'Réalisé Fab': Math.round(sum('realiseFab')),
      'Plan Cndt': Math.round(sum('planCndt')),
      'Réalisé Cndt': Math.round(sum('realiseCndt')),
    };
  }) : [];

  const lignes = view === 'mois' ? pdp?.lignes ?? [] : ytd?.lignes ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Plan Directeur de Production (PDP)</h1>
        <div className="flex gap-2">
          <button className={`btn-secondary text-sm ${view === 'mois' ? 'bg-brand-100 text-brand-800' : ''}`} onClick={() => setView('mois')}>Mois courant</button>
          <button className={`btn-secondary text-sm ${view === 'ytd' ? 'bg-brand-100 text-brand-800' : ''}`} onClick={() => setView('ytd')}>YTD annuel</button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <div>
          <label className="label text-xs">Année</label>
          <select className="input w-28" value={annee} onChange={(e) => setAnnee(parseInt(e.target.value))}>
            {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {view === 'mois' && (
          <div>
            <label className="label text-xs">Mois</label>
            <select className="input w-32" value={mois} onChange={(e) => setMois(parseInt(e.target.value))}>
              {MOIS_LABELS.map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {/* Graphique YTD */}
      {view === 'ytd' && chartData.length > 0 && (
        <div className="card p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">Plan vs Réalisé — {annee}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Plan Fab" fill="#94a3b8" />
              <Bar dataKey="Réalisé Fab" fill="#2563eb" />
              <Bar dataKey="Plan Cndt" fill="#d1fae5" />
              <Bar dataKey="Réalisé Cndt" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-xs">
                <th className="px-3 py-2 font-medium">Produit</th>
                <th className="px-3 py-2 font-medium">Donneur</th>
                <th className="px-3 py-2 font-medium text-right">Plan Fab</th>
                <th className="px-3 py-2 font-medium text-right">Réalisé Fab</th>
                <th className="px-3 py-2 font-medium text-right">Taux Fab</th>
                <th className="px-3 py-2 font-medium text-right">Plan Cndt</th>
                <th className="px-3 py-2 font-medium text-right">Réalisé Cndt</th>
                <th className="px-3 py-2 font-medium text-right">Taux Cndt</th>
                <th className="px-3 py-2 font-medium text-right">Plan CA</th>
                <th className="px-3 py-2 font-medium text-right">Réalisé CA</th>
                <th className="px-3 py-2 font-medium text-right">GAP CA</th>
              </tr>
            </thead>
            <tbody>
              {(lignes as any[]).map((l, i) => {
                const planFab = view === 'mois' ? l.planQteFab : l.planFabTotal;
                const reelFab = view === 'mois' ? l.realiseFab : l.realiseFabTotal;
                const planCndt = view === 'mois' ? l.planQteCndt : l.planCndtTotal;
                const reelCndt = view === 'mois' ? l.realiseCndt : l.realiseCndtTotal;
                const planVal = view === 'mois' ? l.planValeur : l.planValeurTotal;
                const reelVal = view === 'mois' ? l.realiseValeur : l.realiseValeurTotal;
                const tauxFab = l.tauxFab;
                const tauxCndt = l.tauxCndt;
                const gap = reelVal - planVal;

                return (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-xs">{l.produit.codePF}</div>
                      <div className="text-slate-500 text-xs">{l.produit.designation}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{l.donneurOrdre.nom}</td>
                    <td className="px-3 py-2 text-right text-xs">{planFab?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs font-medium">{reelFab?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs">
                      {tauxFab != null ? (
                        <span className={tauxFab >= 100 ? 'text-green-600 font-semibold' : tauxFab >= 80 ? 'text-amber-600' : 'text-red-600 font-semibold'}>
                          {tauxFab.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">{planCndt?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs font-medium">{reelCndt?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs">
                      {tauxCndt != null ? (
                        <span className={tauxCndt >= 100 ? 'text-green-600 font-semibold' : tauxCndt >= 80 ? 'text-amber-600' : 'text-red-600 font-semibold'}>
                          {tauxCndt.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">{planVal?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs font-medium">{reelVal?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs">
                      <span className={gap >= 0 ? 'text-green-600' : 'text-red-600 font-semibold'}>
                        {gap > 0 ? '+' : ''}{gap?.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {lignes.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">Aucune donnée pour cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
