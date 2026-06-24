import { useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { Plus, Pencil, Check, X, Search } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
interface DonneurOrdre { id: string; code: string; nom: string; description?: string; actif: boolean }
interface FormeGalenique { id: string; code: string; nom: string }
interface Produit {
  id: string; codePF: string; designation: string; activite?: string;
  nbUnitesParBoite?: number; tailleStandardLot?: number; dureeVie?: number; aql?: string; actif: boolean;
  donneurOrdre: DonneurOrdre; formeGalenique: FormeGalenique;
}
interface Equipement { id: string; code: string; nom: string; atelier: string; type?: string; actif: boolean }

// ─── Sous-page Donneurs d'ordre ───────────────────────────────
function DonneursPage() {
  const [rows, setRows] = useState<DonneurOrdre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Partial<DonneurOrdre> | null>(null);

  const load = () => api.get('/referentiels/donneurs').then((r) => setRows(r.data)).catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    try {
      if (editing.id) await api.put(`/referentiels/donneurs/${editing.id}`, editing);
      else await api.post('/referentiels/donneurs', editing);
      setEditing(null); load();
    } catch (e) { setError(apiError(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Donneurs d'ordre</h2>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setEditing({ actif: true })}>
          <Plus size={16} /> Nouveau
        </button>
      </div>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {editing && (
        <div className="card mb-4 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Code</label>
              <input className="input" value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" value={editing.nom ?? ''} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm flex items-center gap-1" onClick={save}><Check size={14} /> Enregistrer</button>
            <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => setEditing(null)}><X size={14} /> Annuler</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-slate-500">Chargement…</div> : (
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-slate-50 text-left">
            <th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Nom</th>
            <th className="px-3 py-2 font-medium">Description</th><th className="px-3 py-2 font-medium">Statut</th>
            <th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-3 py-2 font-medium">{r.nom}</td>
                <td className="px-3 py-2 text-slate-500">{r.description}</td>
                <td className="px-3 py-2">
                  <span className={`badge ${r.actif ? 'badge-green' : 'badge-red'}`}>{r.actif ? 'Actif' : 'Inactif'}</span>
                </td>
                <td className="px-3 py-2">
                  <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => setEditing(r)}>
                    <Pencil size={12} /> Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Sous-page Produits ───────────────────────────────────────
function ProduitsPage() {
  const [rows, setRows] = useState<Produit[]>([]);
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>([]);
  const [formes, setFormes] = useState<FormeGalenique[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Partial<Produit & { donneurOrdreId: string; formeGaleniqueId: string }> | null>(null);

  const load = () => {
    Promise.all([
      api.get('/referentiels/produits', { params: { search } }),
      api.get('/referentiels/donneurs'),
      api.get('/referentiels/formes'),
    ]).then(([p, d, f]) => { setRows(p.data); setDonneurs(d.data); setFormes(f.data); })
      .catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search]);

  async function save() {
    if (!editing) return;
    try {
      const payload = {
        codePF: editing.codePF, designation: editing.designation,
        donneurOrdreId: (editing as any).donneurOrdreId,
        formeGaleniqueId: (editing as any).formeGaleniqueId,
        activite: editing.activite, nbUnitesParBoite: editing.nbUnitesParBoite,
        tailleStandardLot: editing.tailleStandardLot, dureeVie: editing.dureeVie, aql: editing.aql,
      };
      if (editing.id) await api.put(`/referentiels/produits/${editing.id}`, payload);
      else await api.post('/referentiels/produits', payload);
      setEditing(null); load();
    } catch (e) { setError(apiError(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Produits</h2>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setEditing({})}>
          <Plus size={16} /> Nouveau produit
        </button>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Search size={16} className="text-slate-400" />
        <input className="input w-64" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {editing && (
        <div className="card mb-4 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Code PF</label><input className="input" value={editing.codePF ?? ''} onChange={(e) => setEditing({ ...editing, codePF: e.target.value })} /></div>
            <div><label className="label">Désignation</label><input className="input" value={editing.designation ?? ''} onChange={(e) => setEditing({ ...editing, designation: e.target.value })} /></div>
            <div><label className="label">Donneur d'ordre</label>
              <select className="input" value={(editing as any).donneurOrdreId ?? ''} onChange={(e) => setEditing({ ...editing, donneurOrdreId: e.target.value } as any)}>
                <option value="">-- Sélectionner --</option>
                {donneurs.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>
            <div><label className="label">Forme galénique</label>
              <select className="input" value={(editing as any).formeGaleniqueId ?? ''} onChange={(e) => setEditing({ ...editing, formeGaleniqueId: e.target.value } as any)}>
                <option value="">-- Sélectionner --</option>
                {formes.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            <div><label className="label">Activité</label><input className="input" value={editing.activite ?? ''} onChange={(e) => setEditing({ ...editing, activite: e.target.value })} /></div>
            <div><label className="label">Unités/boîte</label><input className="input" type="number" value={editing.nbUnitesParBoite ?? ''} onChange={(e) => setEditing({ ...editing, nbUnitesParBoite: parseInt(e.target.value) })} /></div>
            <div><label className="label">Taille lot (kg)</label><input className="input" type="number" value={editing.tailleStandardLot ?? ''} onChange={(e) => setEditing({ ...editing, tailleStandardLot: parseFloat(e.target.value) })} /></div>
            <div><label className="label">Durée de vie (mois)</label><input className="input" type="number" value={editing.dureeVie ?? ''} onChange={(e) => setEditing({ ...editing, dureeVie: parseInt(e.target.value) })} /></div>
            <div><label className="label">AQL</label><input className="input" value={editing.aql ?? ''} onChange={(e) => setEditing({ ...editing, aql: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm flex items-center gap-1" onClick={save}><Check size={14} /> Enregistrer</button>
            <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => setEditing(null)}><X size={14} /> Annuler</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-slate-50 text-left">
              <th className="px-3 py-2 font-medium">Code PF</th>
              <th className="px-3 py-2 font-medium">Désignation</th>
              <th className="px-3 py-2 font-medium">Donneur</th>
              <th className="px-3 py-2 font-medium">Forme</th>
              <th className="px-3 py-2 font-medium">Activité</th>
              <th className="px-3 py-2 font-medium">Lot std (kg)</th>
              <th className="px-3 py-2 font-medium">Durée vie</th>
              <th className="px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{r.codePF}</td>
                  <td className="px-3 py-2 font-medium">{r.designation}</td>
                  <td className="px-3 py-2 text-slate-600">{r.donneurOrdre.nom}</td>
                  <td className="px-3 py-2 text-slate-600">{r.formeGalenique.nom}</td>
                  <td className="px-3 py-2">{r.activite}</td>
                  <td className="px-3 py-2">{r.tailleStandardLot}</td>
                  <td className="px-3 py-2">{r.dureeVie} mois</td>
                  <td className="px-3 py-2">
                    <button className="btn-secondary text-xs flex items-center gap-1"
                      onClick={() => setEditing({ ...r, donneurOrdreId: r.donneurOrdre.id, formeGaleniqueId: r.formeGalenique.id } as any)}>
                      <Pencil size={12} /> Modifier
                    </button>
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

// ─── Sous-page Équipements ────────────────────────────────────
function EquipementsPage() {
  const [rows, setRows] = useState<Equipement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Partial<Equipement> | null>(null);
  const [filtreAtelier, setFiltreAtelier] = useState('');

  const load = () => api.get('/referentiels/equipements', { params: { atelier: filtreAtelier } })
    .then((r) => setRows(r.data)).catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  useEffect(() => { load(); }, [filtreAtelier]);

  async function save() {
    if (!editing) return;
    try {
      if (editing.id) await api.put(`/referentiels/equipements/${editing.id}`, editing);
      else await api.post('/referentiels/equipements', editing);
      setEditing(null); load();
    } catch (e) { setError(apiError(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Équipements et lignes</h2>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setEditing({ actif: true })}>
          <Plus size={16} /> Nouvel équipement
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        <select className="input w-48" value={filtreAtelier} onChange={(e) => setFiltreAtelier(e.target.value)}>
          <option value="">Tous les ateliers</option>
          <option value="FABRICATION">Fabrication</option>
          <option value="CONDITIONNEMENT">Conditionnement</option>
        </select>
      </div>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {editing && (
        <div className="card mb-4 p-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div><label className="label">Code</label><input className="input" value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></div>
            <div><label className="label">Nom</label><input className="input" value={editing.nom ?? ''} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} /></div>
            <div><label className="label">Atelier</label>
              <select className="input" value={editing.atelier ?? ''} onChange={(e) => setEditing({ ...editing, atelier: e.target.value })}>
                <option value="">--</option>
                <option value="FABRICATION">Fabrication</option>
                <option value="CONDITIONNEMENT">Conditionnement</option>
              </select>
            </div>
            <div><label className="label">Type</label><input className="input" value={editing.type ?? ''} onChange={(e) => setEditing({ ...editing, type: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm flex items-center gap-1" onClick={save}><Check size={14} /> Enregistrer</button>
            <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => setEditing(null)}><X size={14} /> Annuler</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-slate-500">Chargement…</div> : (
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-slate-50 text-left">
            <th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Nom</th>
            <th className="px-3 py-2 font-medium">Atelier</th><th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-3 py-2 font-medium">{r.nom}</td>
                <td className="px-3 py-2">
                  <span className={`badge ${r.atelier === 'FABRICATION' ? 'badge-blue' : 'badge-purple'}`}>{r.atelier}</span>
                </td>
                <td className="px-3 py-2 text-slate-500">{r.type}</td>
                <td className="px-3 py-2">
                  <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => setEditing(r)}><Pencil size={12} /> Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Composant principal avec onglets ─────────────────────────
type Tab = 'donneurs' | 'produits' | 'equipements';

export function ReferentielsPage({ tab = 'donneurs' }: { tab?: Tab }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Référentiels et données de base</h1>
      <div className="card p-6">
        {tab === 'donneurs' && <DonneursPage />}
        {tab === 'produits' && <ProduitsPage />}
        {tab === 'equipements' && <EquipementsPage />}
      </div>
    </div>
  );
}
