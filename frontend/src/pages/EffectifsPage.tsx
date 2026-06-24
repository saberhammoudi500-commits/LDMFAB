import { useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { Users, Plus, Pencil, Check, X } from 'lucide-react';

interface Employe {
  id: string; matricule: string; nom: string; prenom: string;
  typeContrat: string; grade: string; fonction?: string; service?: string; actif: boolean;
  manager?: { nom: string; prenom: string };
  subordonnes: { id: string; nom: string; prenom: string }[];
}

interface Stats {
  total: number;
  parContrat: Record<string, number>;
  parGrade: Record<string, number>;
}

export function EffectifsPage() {
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Partial<Employe> | null>(null);

  const load = () => {
    api.get('/effectifs').then((r) => { setEmployes(r.data.employes); setStats(r.data.stats); })
      .catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    try {
      if (editing.id) await api.put(`/effectifs/${editing.id}`, editing);
      else await api.post('/effectifs', editing);
      setEditing(null); load();
    } catch (e) { setError(apiError(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Effectifs (HC)</h1>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setEditing({ actif: true, typeContrat: 'CDI', grade: 'G1' })}>
          <Plus size={16} /> Nouvel employé
        </button>
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card p-4 flex items-center gap-3">
            <Users size={24} className="text-blue-500" />
            <div><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-slate-500">Total effectif</div></div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-2">Par contrat</div>
            {Object.entries(stats.parContrat).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-600">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
          <div className="card p-4 col-span-2">
            <div className="text-xs text-slate-500 mb-2">Par grade</div>
            <div className="flex gap-4">
              {Object.entries(stats.parGrade).map(([k, v]) => (
                <div key={k} className="text-center">
                  <div className="text-lg font-bold text-blue-600">{v}</div>
                  <div className="text-xs text-slate-500">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {editing && (
        <div className="card mb-4 p-4 space-y-3">
          <h2 className="font-semibold">{editing.id ? 'Modifier employé' : 'Nouvel employé'}</h2>
          <div className="grid grid-cols-4 gap-3">
            <div><label className="label">Matricule</label><input className="input" value={editing.matricule ?? ''} onChange={(e) => setEditing({ ...editing, matricule: e.target.value })} /></div>
            <div><label className="label">Nom</label><input className="input" value={editing.nom ?? ''} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} /></div>
            <div><label className="label">Prénom</label><input className="input" value={editing.prenom ?? ''} onChange={(e) => setEditing({ ...editing, prenom: e.target.value })} /></div>
            <div><label className="label">Contrat</label>
              <select className="input" value={editing.typeContrat ?? 'CDI'} onChange={(e) => setEditing({ ...editing, typeContrat: e.target.value })}>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
              </select>
            </div>
            <div><label className="label">Grade</label>
              <select className="input" value={editing.grade ?? 'G1'} onChange={(e) => setEditing({ ...editing, grade: e.target.value })}>
                {['G1', 'G2', 'G3', 'G4'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div><label className="label">Fonction</label><input className="input" value={editing.fonction ?? ''} onChange={(e) => setEditing({ ...editing, fonction: e.target.value })} /></div>
            <div><label className="label">Service</label><input className="input" value={editing.service ?? ''} onChange={(e) => setEditing({ ...editing, service: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm flex items-center gap-1" onClick={save}><Check size={14} /> Enregistrer</button>
            <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => setEditing(null)}><X size={14} /> Annuler</button>
          </div>
        </div>
      )}

      {loading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-xs">
                <th className="px-3 py-2 font-medium">Matricule</th>
                <th className="px-3 py-2 font-medium">Nom</th>
                <th className="px-3 py-2 font-medium">Prénom</th>
                <th className="px-3 py-2 font-medium">Contrat</th>
                <th className="px-3 py-2 font-medium">Grade</th>
                <th className="px-3 py-2 font-medium">Fonction</th>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Manager</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employes.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{e.matricule}</td>
                  <td className="px-3 py-2 font-medium">{e.nom}</td>
                  <td className="px-3 py-2">{e.prenom}</td>
                  <td className="px-3 py-2"><span className={`badge ${e.typeContrat === 'CDI' ? 'badge-green' : 'badge-amber'}`}>{e.typeContrat}</span></td>
                  <td className="px-3 py-2"><span className="badge badge-blue">{e.grade}</span></td>
                  <td className="px-3 py-2 text-slate-600">{e.fonction}</td>
                  <td className="px-3 py-2 text-slate-600">{e.service}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {e.manager ? `${e.manager.nom} ${e.manager.prenom}` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`badge ${e.actif ? 'badge-green' : 'badge-red'}`}>{e.actif ? 'Actif' : 'Inactif'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => setEditing(e)}><Pencil size={12} /> Modifier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
