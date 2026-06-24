import { useState, useEffect } from 'react';
import { api, apiError } from '../api/client';
import { X, Check } from 'lucide-react';

interface Produit { id: string; codePF: string; designation: string; donneurOrdre: { nom: string } }

interface Props {
  onClose: () => void;
  onSaved: () => void;
  ofId?: string;
}

export function OFFormModal({ onClose, onSaved, ofId }: Props) {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [form, setForm] = useState({
    numeroOF: '',
    produitId: '',
    numeroLot: '',
    receptionOF: '',
    finValiditeOF: '',
    tailleLoT: '',
    qteTheorique: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/referentiels/produits').then((r) => setProduits(r.data)).catch(() => {});
    if (ofId) {
      api.get(`/fabrication/of/${ofId}`).then((r) => {
        const d = r.data;
        setForm({
          numeroOF: d.numeroOF ?? '',
          produitId: d.produitId ?? '',
          numeroLot: d.numeroLot ?? '',
          receptionOF: d.receptionOF ? d.receptionOF.slice(0, 10) : '',
          finValiditeOF: d.finValiditeOF ? d.finValiditeOF.slice(0, 10) : '',
          tailleLoT: d.tailleLoT ?? '',
          qteTheorique: d.qteTheorique ?? '',
        });
      }).catch(() => {});
    }
  }, [ofId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        tailleLoT: form.tailleLoT ? parseFloat(form.tailleLoT) : undefined,
        qteTheorique: form.qteTheorique ? parseFloat(form.qteTheorique) : undefined,
        receptionOF: form.receptionOF ? new Date(form.receptionOF).toISOString() : undefined,
        finValiditeOF: form.finValiditeOF ? new Date(form.finValiditeOF).toISOString() : undefined,
      };
      if (ofId) await api.put(`/fabrication/of/${ofId}`, payload);
      else await api.post('/fabrication/of', payload);
      onSaved();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{ofId ? 'Modifier l\'OF' : 'Créer un Ordre de Fabrication'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Numéro OF *</label>
              <input className="input" required value={form.numeroOF} onChange={(e) => setForm({ ...form, numeroOF: e.target.value })} />
            </div>
            <div>
              <label className="label">Numéro de lot *</label>
              <input className="input" required value={form.numeroLot} onChange={(e) => setForm({ ...form, numeroLot: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Produit *</label>
              <select className="input" required value={form.produitId} onChange={(e) => setForm({ ...form, produitId: e.target.value })}>
                <option value="">-- Sélectionner un produit --</option>
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>{p.codePF} — {p.designation} ({p.donneurOrdre.nom})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date de réception OF</label>
              <input className="input" type="date" value={form.receptionOF} onChange={(e) => setForm({ ...form, receptionOF: e.target.value })} />
            </div>
            <div>
              <label className="label">Fin de validité OF</label>
              <input className="input" type="date" value={form.finValiditeOF} onChange={(e) => setForm({ ...form, finValiditeOF: e.target.value })} />
            </div>
            <div>
              <label className="label">Taille du lot (kg)</label>
              <input className="input" type="number" step="0.001" value={form.tailleLoT} onChange={(e) => setForm({ ...form, tailleLoT: e.target.value })} />
            </div>
            <div>
              <label className="label">Quantité théorique (unités)</label>
              <input className="input" type="number" value={form.qteTheorique} onChange={(e) => setForm({ ...form, qteTheorique: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              <Check size={16} /> {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}
