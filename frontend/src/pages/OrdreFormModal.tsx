import { useState } from 'react';
import { Modal } from '../components/Modal';
import { createOrdre, updateOrdre } from '../lib/db';
import { toDateInput } from '../lib/format';
import type { OrdreFabrication } from '../lib/types';

interface Props {
  of: OrdreFabrication | null;
  onClose: () => void;
  onSaved: () => void;
}

type FormState = Record<string, string>;

const DATE_FIELDS = [
  'dateDeclarationSF', 'receptionOF', 'finValiditeOF',
  'dateFinPesee', 'dateFinGranulation', 'dateFinMelange', 'dateFinCompRemp', 'dateFinPelliculage',
  'dateFinFabrication', 'dateEnvoi', 'dateReceptionRectif', 'dateEnvoiApresRectif', 'dateFinCNDT',
];
const NUM_FIELDS = [
  'quantiteKg', 'quantiteFabriqueeCps', 'quantiteTheoriqueKg',
  'rendementKg1', 'rendementKg2', 'rendementCps1', 'rendementKg3', 'rendementCps2',
];

function initState(o: OrdreFabrication | null): FormState {
  const s: FormState = {};
  const fields = [
    'validiteOF', 'cndt', 'codeProduit', 'designation', 'numeroLot',
    'statutLibere', 'verificateurNom', 'aql', 'test3', 'test4',
    ...DATE_FIELDS, ...NUM_FIELDS,
  ];
  for (const f of fields) {
    const v = o ? (o as any)[f] : null;
    if (DATE_FIELDS.includes(f)) s[f] = toDateInput(v);
    else s[f] = v === null || v === undefined ? '' : String(v);
  }
  return s;
}

function Field({ label, name, state, set, type = 'text' }: { label: string; name: string; state: FormState; set: (n: string, v: string) => void; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={state[name] ?? ''} onChange={(e) => set(name, e.target.value)} />
    </div>
  );
}

export function OrdreFormModal({ of: ordre, onClose, onSaved }: Props) {
  const [state, setState] = useState<FormState>(() => initState(ordre));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);



  function set(name: string, value: string) {
    setState((s) => ({ ...s, [name]: value }));
  }

  function buildPayload() {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
      if (v === '') {
        payload[k] = null;
      } else if (NUM_FIELDS.includes(k)) {
        payload[k] = Number(v.replace(',', '.'));
      } else {
        payload[k] = v;
      }
    }
    return payload;
  }

  async function save() {
    setError('');
    setSaving(true);
    try {
      const payload = buildPayload();
      if (ordre) {
        if (!reason.trim()) {
          setError('Le motif de modification est obligatoire (21 CFR Part 11).');
          setSaving(false);
          return;
        }
        await updateOrdre(ordre.id, payload as any, reason);
      } else {
        await createOrdre(payload as any);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={ordre ? `Modifier OF — lot ${ordre.numeroLot}` : 'Nouvel ordre de fabrication'} onClose={onClose} size="xl">
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-brand-800">Identification &amp; validite</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Code produit *" name="codeProduit" state={state} set={set} />
            <div className="md:col-span-2">
              <label className="label">Designation *</label>
              <input className="input" value={state.designation} onChange={(e) => set('designation', e.target.value)} />
            </div>
            <Field label="N de lot *" name="numeroLot" state={state} set={set} />
            <Field label="Ligne / CNDT" name="cndt" state={state} set={set} />
            <Field label="Validite OF" name="validiteOF" state={state} set={set} />
            <Field label="Date declaration SF" name="dateDeclarationSF" type="date" state={state} set={set} />
            <Field label="Reception OF" name="receptionOF" type="date" state={state} set={set} />
            <Field label="Fin validite OF" name="finValiditeOF" type="date" state={state} set={set} />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-brand-800">Etapes de fabrication</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Field label="Fin pesee" name="dateFinPesee" type="date" state={state} set={set} />
            <Field label="Fin granulation" name="dateFinGranulation" type="date" state={state} set={set} />
            <Field label="Fin melange" name="dateFinMelange" type="date" state={state} set={set} />
            <Field label="Fin comp/remp" name="dateFinCompRemp" type="date" state={state} set={set} />
            <Field label="Fin pelliculage" name="dateFinPelliculage" type="date" state={state} set={set} />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-brand-800">Quantites &amp; rendements</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Quantite (kg)" name="quantiteKg" state={state} set={set} />
            <Field label="Quantite theorique (kg)" name="quantiteTheoriqueKg" state={state} set={set} />
            <Field label="Quantite fabriquee (cps)" name="quantiteFabriqueeCps" state={state} set={set} />
            <div className="flex items-end text-xs text-slate-500">
              Rendement total recalcule automatiquement (qte / qte theorique).
            </div>
            <Field label="Y % (kg)" name="rendementKg1" state={state} set={set} />
            <Field label="Y % (kg) 2" name="rendementKg2" state={state} set={set} />
            <Field label="Y % CPS" name="rendementCps1" state={state} set={set} />
            <Field label="Y % (kg) 3" name="rendementKg3" state={state} set={set} />
            <Field label="Y % CPS 2" name="rendementCps2" state={state} set={set} />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-brand-800">Controle &amp; liberation</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Statut (OUI/NON)" name="statutLibere" state={state} set={set} />
            <Field label="Fin fabrication" name="dateFinFabrication" type="date" state={state} set={set} />
            <Field label="Verificateur" name="verificateurNom" state={state} set={set} />
            <div>
              <label className="label">AQL</label>
              <select className="input" value={state.aql} onChange={(e) => set('aql', e.target.value)}>
                <option value="">—</option>
                <option value="CONFORME">CONFORME</option>
                <option value="NON CONFORME">NON CONFORME</option>
                <option value="EN ATTENTE">EN ATTENTE</option>
              </select>
            </div>
            <Field label="Date d'envoi" name="dateEnvoi" type="date" state={state} set={set} />
            <Field label="Reception pour rectif" name="dateReceptionRectif" type="date" state={state} set={set} />
            <Field label="Envoi apres rectif" name="dateEnvoiApresRectif" type="date" state={state} set={set} />
            <Field label="Date fin CNDT" name="dateFinCNDT" type="date" state={state} set={set} />
            <Field label="TEST3" name="test3" state={state} set={set} />
            <Field label="TEST4" name="test4" state={state} set={set} />
          </div>
        </section>

        {ordre && (
          <div>
            <label className="label">Motif de modification * (trace dans l'audit)</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: correction du rendement suite recomptage" />
          </div>
        )}

        {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
