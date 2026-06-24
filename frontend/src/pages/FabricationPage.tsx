import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../api/client';
import { Plus, Search, AlertTriangle, Clock, CheckCircle, Eye, Filter } from 'lucide-react';
import { OFFormModal } from './OFFormModal';

interface OF {
  id: string;
  numeroOF: string;
  numeroLot: string;
  workflowStatus: string;
  receptionOF?: string;
  finValiditeOF?: string;
  tailleLoT?: number;
  qteTheorique?: number;
  joursValidite?: number;
  alertePeremption?: boolean;
  rendementTotal?: number;
  delaisFab?: number;
  produit: {
    codePF: string;
    designation: string;
    donneurOrdre: { nom: string };
    formeGalenique: { nom: string };
  };
  phasesRealisation: { phase: string; statut: string; dateFin?: string }[];
  conditionnement?: { statut: string; tauxCndt?: number };
  ddl?: { statut: string };
}

const STATUS_LABELS: Record<string, string> = {
  RECU: 'Reçu', EN_COURS: 'En cours', SF_DECLARE: 'SF Déclaré',
  CONDITIONNE: 'Conditionné', CLOTURE: 'Clôturé',
};

const STATUS_COLORS: Record<string, string> = {
  RECU: 'badge-slate', EN_COURS: 'badge-blue', SF_DECLARE: 'badge-amber',
  CONDITIONNE: 'badge-purple', CLOTURE: 'badge-green',
};

const PHASES = ['PESEE', 'GRANULATION', 'MELANGE', 'COMPRESSION', 'GELULE', 'PELLICULAGE', 'CREME'];

function PhaseIndicator({ phases }: { phases: OF['phasesRealisation'] }) {
  const done = phases.filter((p) => p.statut === 'TERMINE' || p.statut === 'CONFORME').length;
  const total = phases.length;
  if (total === 0) return <span className="text-slate-400 text-xs">Aucune phase</span>;
  return (
    <div className="flex items-center gap-1 text-xs text-slate-600">
      <div className="flex gap-0.5">
        {PHASES.map((ph) => {
          const p = phases.find((x) => x.phase === ph);
          return (
            <div key={ph} title={ph} className={`w-3 h-3 rounded-sm ${
              !p ? 'bg-slate-100' :
              p.statut === 'CONFORME' ? 'bg-green-500' :
              p.statut === 'TERMINE' ? 'bg-blue-500' :
              p.statut === 'NON_CONFORME' ? 'bg-red-500' :
              'bg-amber-400'
            }`} />
          );
        })}
      </div>
      <span>{done}/{total}</span>
    </div>
  );
}

export function FabricationPage() {
  const [rows, setRows] = useState<OF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [alerteOnly, setAlerteOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.get('/fabrication/of', {
      params: { search, status, page, pageSize: 25, alertePeremption: alerteOnly || undefined },
    }).then((r) => {
      setRows(r.data.data);
      setTotal(r.data.pagination.total);
    }).catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, status, alerteOnly, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Fabrication — Ordres de Fabrication</h1>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nouvel OF
        </button>
      </div>

      {/* Filtres */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input className="input w-56" placeholder="N° OF, lot, produit…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={alerteOnly} onChange={(e) => setAlerteOnly(e.target.checked)} />
          <AlertTriangle size={14} className="text-red-500" /> Alertes péremption seulement
        </label>
        <div className="ml-auto text-sm text-slate-500">{total} OF trouvés</div>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {loading ? (
        <div className="text-slate-500">Chargement…</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-3 py-2 font-medium">N° OF</th>
                <th className="px-3 py-2 font-medium">N° Lot</th>
                <th className="px-3 py-2 font-medium">Produit</th>
                <th className="px-3 py-2 font-medium">Donneur</th>
                <th className="px-3 py-2 font-medium">Forme</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Validité</th>
                <th className="px-3 py-2 font-medium">Phases</th>
                <th className="px-3 py-2 font-medium">Rdt%</th>
                <th className="px-3 py-2 font-medium">Cndt</th>
                <th className="px-3 py-2 font-medium">DDL</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${r.alertePeremption ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-2 font-mono text-xs font-medium">{r.numeroOF}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.numeroLot}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-xs">{r.produit.codePF}</div>
                    <div className="text-slate-500 text-xs truncate max-w-32">{r.produit.designation}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.produit.donneurOrdre.nom}</td>
                  <td className="px-3 py-2 text-xs">{r.produit.formeGalenique.nom}</td>
                  <td className="px-3 py-2">
                    <span className={`badge ${STATUS_COLORS[r.workflowStatus] ?? 'badge-slate'}`}>
                      {STATUS_LABELS[r.workflowStatus] ?? r.workflowStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.joursValidite != null ? (
                      <span className={`flex items-center gap-1 ${r.joursValidite < 0 ? 'text-red-600 font-bold' : r.joursValidite < 30 ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                        {r.joursValidite < 0 ? <AlertTriangle size={12} /> : r.joursValidite < 30 ? <Clock size={12} /> : <CheckCircle size={12} />}
                        {r.joursValidite}j
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2"><PhaseIndicator phases={r.phasesRealisation} /></td>
                  <td className="px-3 py-2 text-xs">
                    {r.rendementTotal != null ? <span className={r.rendementTotal < 90 ? 'text-red-600 font-semibold' : 'text-green-700'}>{r.rendementTotal.toFixed(1)}%</span> : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.conditionnement ? (
                      <span className={`badge ${r.conditionnement.statut === 'TERMINE' ? 'badge-green' : 'badge-amber'}`}>
                        {r.conditionnement.tauxCndt != null ? `${r.conditionnement.tauxCndt.toFixed(1)}%` : r.conditionnement.statut}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.ddl ? (
                      <span className={`badge ${r.ddl.statut === 'VALIDE' ? 'badge-green' : r.ddl.statut === 'EN_VERIFICATION' ? 'badge-blue' : 'badge-slate'}`}>
                        {r.ddl.statut}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button className="btn-secondary text-xs flex items-center gap-1"
                      onClick={() => navigate(`/fabrication/${r.id}`)}>
                      <Eye size={12} /> Détail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 25 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <button className="btn-secondary text-xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Précédent</button>
              <span className="text-sm text-slate-500">Page {page} / {Math.ceil(total / 25)}</span>
              <button className="btn-secondary text-xs" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(page + 1)}>Suivant →</button>
            </div>
          )}
        </div>
      )}

      {showForm && <OFFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}
