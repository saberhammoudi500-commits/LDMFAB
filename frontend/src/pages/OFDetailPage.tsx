import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, apiError } from '../api/client';
import { ArrowLeft, CheckCircle, AlertTriangle, Clock, Edit, Plus } from 'lucide-react';

interface Phase {
  id: string; phase: string; statut: string;
  dateDebut?: string; dateFin?: string;
  qteEntreeKg?: number; qteSortieKg?: number;
  rendementKg?: number; avarieKg?: number;
  observation?: string;
  equipement?: { nom: string };
  operateur?: { firstName: string; lastName: string };
}

interface OF {
  id: string; numeroOF: string; numeroLot: string;
  workflowStatus: string; joursValidite?: number; alertePeremption?: boolean;
  receptionOF?: string; finValiditeOF?: string;
  tailleLoT?: number; qteTheorique?: number; rendementTotal?: number;
  dateDeclarationSF?: string; qteSF?: number;
  produit: { codePF: string; designation: string; formeGalenique: { nom: string }; donneurOrdre: { nom: string } };
  phasesRealisation: Phase[];
  conditionnement?: { statut: string; qteFabrique?: number; qteCndt?: number; tauxCndt?: number; dateDebutCndt?: string; dateFinCndt?: string };
  ddl?: { statut: string; dateEmission?: string; dateEnvoi?: string; dateVerification?: string; joursAttente?: number };
  prolongations: { id: string; dateDemande: string; statut: string; observation?: string }[];
}

const PHASES = ['PESEE', 'GRANULATION', 'MELANGE', 'COMPRESSION', 'GELULE', 'PELLICULAGE', 'CREME'];
const PHASE_LABELS: Record<string, string> = {
  PESEE: 'Pesée', GRANULATION: 'Granulation/Séchage', MELANGE: 'Mélange',
  COMPRESSION: 'Compression', GELULE: 'Remplissage gélules', PELLICULAGE: 'Pelliculage', CREME: 'Crème/Pommade',
};

function PhaseRow({ of, phase, onSaved }: { of: OF; phase: string; onSaved: () => void }) {
  const existing = of.phasesRealisation.find((p) => p.phase === phase);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    dateDebut: existing?.dateDebut?.slice(0, 16) ?? '',
    dateFin: existing?.dateFin?.slice(0, 16) ?? '',
    qteEntreeKg: existing?.qteEntreeKg?.toString() ?? '',
    qteSortieKg: existing?.qteSortieKg?.toString() ?? '',
    avarieKg: existing?.avarieKg?.toString() ?? '',
    statut: existing?.statut ?? 'EN_COURS',
    observation: existing?.observation ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    try {
      await api.put(`/fabrication/of/${of.id}/phases/${phase}`, {
        ...form,
        qteEntreeKg: form.qteEntreeKg ? parseFloat(form.qteEntreeKg) : undefined,
        qteSortieKg: form.qteSortieKg ? parseFloat(form.qteSortieKg) : undefined,
        avarieKg: form.avarieKg ? parseFloat(form.avarieKg) : undefined,
        dateDebut: form.dateDebut ? new Date(form.dateDebut).toISOString() : undefined,
        dateFin: form.dateFin ? new Date(form.dateFin).toISOString() : undefined,
      });
      setEditing(false);
      onSaved();
    } catch (e) { setError(apiError(e)); }
    finally { setSaving(false); }
  }

  const rend = existing?.rendementKg;

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            !existing ? 'bg-slate-200' :
            existing.statut === 'CONFORME' ? 'bg-green-500' :
            existing.statut === 'TERMINE' ? 'bg-blue-500' :
            existing.statut === 'NON_CONFORME' ? 'bg-red-500' :
            'bg-amber-400'
          }`} />
          <span className="font-medium text-sm">{PHASE_LABELS[phase] ?? phase}</span>
          {rend != null && (
            <span className={`badge text-xs ${rend >= 95 ? 'badge-green' : rend >= 90 ? 'badge-amber' : 'badge-red'}`}>
              Rdt: {rend.toFixed(1)}%
            </span>
          )}
        </div>
        <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => setEditing(!editing)}>
          <Edit size={12} /> {existing ? 'Modifier' : 'Saisir'}
        </button>
      </div>

      {existing && !editing && (
        <div className="grid grid-cols-4 gap-3 text-xs text-slate-600">
          <div><span className="text-slate-400">Début:</span> {existing.dateDebut ? new Date(existing.dateDebut).toLocaleDateString('fr-FR') : '—'}</div>
          <div><span className="text-slate-400">Fin:</span> {existing.dateFin ? new Date(existing.dateFin).toLocaleDateString('fr-FR') : '—'}</div>
          <div><span className="text-slate-400">Entrée:</span> {existing.qteEntreeKg} kg</div>
          <div><span className="text-slate-400">Sortie:</span> {existing.qteSortieKg} kg</div>
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-3">
          {error && <div className="text-red-600 text-xs">{error}</div>}
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label text-xs">Début</label><input className="input text-xs" type="datetime-local" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} /></div>
            <div><label className="label text-xs">Fin</label><input className="input text-xs" type="datetime-local" value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })} /></div>
            <div><label className="label text-xs">Statut</label>
              <select className="input text-xs" value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINE">Terminé</option>
                <option value="CONFORME">Conforme</option>
                <option value="NON_CONFORME">Non conforme</option>
                <option value="DEVIATION">Déviation</option>
              </select>
            </div>
            <div><label className="label text-xs">Qté entrée (kg)</label><input className="input text-xs" type="number" step="0.001" value={form.qteEntreeKg} onChange={(e) => setForm({ ...form, qteEntreeKg: e.target.value })} /></div>
            <div><label className="label text-xs">Qté sortie (kg)</label><input className="input text-xs" type="number" step="0.001" value={form.qteSortieKg} onChange={(e) => setForm({ ...form, qteSortieKg: e.target.value })} /></div>
            <div><label className="label text-xs">Avarie (kg)</label><input className="input text-xs" type="number" step="0.001" value={form.avarieKg} onChange={(e) => setForm({ ...form, avarieKg: e.target.value })} /></div>
            <div className="col-span-3"><label className="label text-xs">Observation</label><input className="input text-xs" value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-xs" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button className="btn-secondary text-xs" onClick={() => setEditing(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OFDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [of, setOf] = useState<OF | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    if (!id) return;
    api.get(`/fabrication/of/${id}`)
      .then((r) => setOf(r.data))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-slate-500">Chargement…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!of) return null;

  const phases = PHASES.filter((ph) =>
    ['COMPRESSION', 'GELULE', 'CREME'].includes(ph)
      ? of.produit.formeGalenique.nom.toLowerCase().includes(ph === 'CREME' ? 'crème' : ph === 'GELULE' ? 'gélule' : 'comprimé')
      : true
  );

  return (
    <div>
      <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Retour
      </button>

      {/* En-tête */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold text-slate-800">{of.numeroOF}</div>
            <div className="text-slate-600 mt-1">{of.produit.codePF} — {of.produit.designation}</div>
            <div className="text-slate-500 text-sm mt-1">{of.produit.donneurOrdre.nom} · {of.produit.formeGalenique.nom}</div>
          </div>
          <div className="text-right space-y-2">
            <div>
              <span className="badge badge-blue text-sm">{of.workflowStatus}</span>
            </div>
            {of.joursValidite != null && (
              <div className={`flex items-center gap-1 text-sm ${of.joursValidite < 0 ? 'text-red-600' : of.joursValidite < 30 ? 'text-amber-600' : 'text-green-600'}`}>
                {of.joursValidite < 0 ? <AlertTriangle size={14} /> : <Clock size={14} />}
                {of.joursValidite}j de validité restants
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100">
          <div><div className="text-xs text-slate-400">N° Lot</div><div className="font-mono font-medium">{of.numeroLot}</div></div>
          <div><div className="text-xs text-slate-400">Réception OF</div><div>{of.receptionOF ? new Date(of.receptionOF).toLocaleDateString('fr-FR') : '—'}</div></div>
          <div><div className="text-xs text-slate-400">Fin validité OF</div><div>{of.finValiditeOF ? new Date(of.finValiditeOF).toLocaleDateString('fr-FR') : '—'}</div></div>
          <div><div className="text-xs text-slate-400">Taille lot</div><div>{of.tailleLoT} kg</div></div>
          <div><div className="text-xs text-slate-400">Qté théorique</div><div>{of.qteTheorique?.toLocaleString()} unités</div></div>
          <div><div className="text-xs text-slate-400">Rendement total</div>
            <div className={of.rendementTotal != null && of.rendementTotal < 90 ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>
              {of.rendementTotal != null ? `${of.rendementTotal.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Phases de fabrication */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">Phases de fabrication</h2>
        <div className="space-y-3">
          {PHASES.map((ph) => (
            <PhaseRow key={ph} of={of} phase={ph} onSaved={load} />
          ))}
        </div>
      </div>

      {/* Conditionnement */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">Conditionnement</h2>
        {of.conditionnement ? (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-slate-400">Statut</div><div className="font-medium">{of.conditionnement.statut}</div></div>
            <div><div className="text-xs text-slate-400">Qté fabriquée</div><div>{of.conditionnement.qteFabrique?.toLocaleString()}</div></div>
            <div><div className="text-xs text-slate-400">Qté conditionnée</div><div>{of.conditionnement.qteCndt?.toLocaleString()}</div></div>
            <div><div className="text-xs text-slate-400">Taux</div>
              <div className={of.conditionnement.tauxCndt != null && of.conditionnement.tauxCndt < 95 ? 'text-amber-600 font-semibold' : 'text-green-700 font-semibold'}>
                {of.conditionnement.tauxCndt != null ? `${of.conditionnement.tauxCndt.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-sm">Conditionnement non démarré</div>
        )}
      </div>

      {/* DDL */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">Dossier de Lot (DDL)</h2>
        {of.ddl ? (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-slate-400">Statut</div>
              <span className={`badge ${of.ddl.statut === 'VALIDE' ? 'badge-green' : of.ddl.statut === 'EN_VERIFICATION' ? 'badge-blue' : 'badge-slate'}`}>{of.ddl.statut}</span>
            </div>
            <div><div className="text-xs text-slate-400">Émission</div><div>{of.ddl.dateEmission ? new Date(of.ddl.dateEmission).toLocaleDateString('fr-FR') : '—'}</div></div>
            <div><div className="text-xs text-slate-400">Envoi</div><div>{of.ddl.dateEnvoi ? new Date(of.ddl.dateEnvoi).toLocaleDateString('fr-FR') : '—'}</div></div>
            <div><div className="text-xs text-slate-400">Jours d'attente</div>
              <div className={of.ddl.joursAttente != null && of.ddl.joursAttente > 7 ? 'text-red-600 font-semibold' : ''}>
                {of.ddl.joursAttente ?? '—'} j
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-sm">DDL non émis</div>
        )}
      </div>

      {/* Prolongations */}
      {of.prolongations.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold mb-4">Prolongations OF</h2>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50">
              <th className="px-3 py-2 font-medium text-left">Date demande</th>
              <th className="px-3 py-2 font-medium text-left">Statut</th>
              <th className="px-3 py-2 font-medium text-left">Observation</th>
            </tr></thead>
            <tbody>
              {of.prolongations.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{new Date(p.dateDemande).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-2"><span className="badge badge-amber">{p.statut}</span></td>
                  <td className="px-3 py-2 text-slate-500">{p.observation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
