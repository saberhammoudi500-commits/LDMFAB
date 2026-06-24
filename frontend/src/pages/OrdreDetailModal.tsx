import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal';
import { fetchOrdreById, signOrdre, updateOrdre } from '../lib/db';
import { frDate, frDateTime, pct, num, STATUS_COLORS, aqlColor } from '../lib/format';
import type { OrdreFabrication } from '../lib/types';
import { useAuth } from '../auth/AuthContext';
import { PenLine, ArrowRight } from 'lucide-react';

interface Props {
  id: string;
  onClose: () => void;
  onRefresh: () => void;
}

const WORKFLOW_TRANSITIONS: Record<string, string[]> = {
  CREATION: ['EN_COURS'],
  EN_COURS: ['FABRICATION_TERMINEE'],
  FABRICATION_TERMINEE: ['VERIFICATION'],
  VERIFICATION: ['CLOTURE', 'RECTIFICATION'],
  RECTIFICATION: ['VERIFICATION'],
  CLOTURE: [],
};
const WORKFLOW_LABELS: Record<string, string> = {
  CREATION: 'Création', EN_COURS: 'En cours', FABRICATION_TERMINEE: 'Fabrication terminée',
  VERIFICATION: 'Vérification', RECTIFICATION: 'Rectification', CLOTURE: 'Clôturé',
};
const MEANING_LABELS: Record<string, string> = {
  AUTHOR: 'Auteur / Realisation', REVIEWER: 'Verificateur', APPROVER: 'Approbateur / Liberation',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right">{value || '—'}</span>
    </div>
  );
}

export function OrdreDetailModal({ id, onClose, onRefresh }: Props) {
  const { can } = useAuth();
  const [of, setOf] = useState<OrdreFabrication | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signMeaning, setSignMeaning] = useState('REVIEWER');
  const [signReason, setSignReason] = useState('');
  const [signPwd, setSignPwd] = useState('');

  function load() {
    fetchOrdreById(id).then(setOf).catch((e: any) => setError(e.message));
  }
  useEffect(load, [id]);

  async function transition(target: string) {
    setBusy(true);
    setError('');
    const { error: err } = await (async () => {
      try {
        await updateOrdre(id, { workflowStatus: target }, `Transition vers ${WORKFLOW_LABELS[target]}`);
        load(); onRefresh();
        return { error: null };
      } catch (e: any) {
        return { error: e.message };
      }
    })();
    if (err) setError(err);
    setBusy(false);
  }

  async function sign() {
    setBusy(true);
    setError('');
    try {
      await signOrdre({ entityId: id, meaning: signMeaning, reason: signReason, password: signPwd });
      setSignReason(''); setSignPwd('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!of) {
    return (
      <Modal open title="Ordre de fabrication" onClose={onClose} size="lg">
        <div className="text-slate-500">{error || 'Chargement…'}</div>
      </Modal>
    );
  }

  const nextStates = WORKFLOW_TRANSITIONS[of.workflowStatus] ?? [];

  return (
    <Modal open title={`OF ${of.codeProduit} — lot ${of.numeroLot}`} onClose={onClose} size="xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${STATUS_COLORS[of.workflowStatus] ?? 'bg-slate-100'}`}>{of.workflowLabel}</span>
          {of.aql && <span className={`badge ${aqlColor(of.aql)}`}>AQL : {of.aql}</span>}
          {of.rendementHorsSeuil && <span className="badge bg-red-100 text-red-700">Rendement sous seuil</span>}
        </div>

        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-brand-800">Identification</h3>
            <Row label="Designation" value={of.designation} />
            <Row label="Ligne / CNDT" value={of.cndt} />
            <Row label="Validite OF" value={of.validiteOF} />
            <Row label="Declaration SF" value={frDate(of.dateDeclarationSF)} />
            <Row label="Fin validite OF" value={frDate(of.finValiditeOF)} />
            <h3 className="mb-1 mt-4 text-sm font-semibold text-brand-800">Etapes</h3>
            <Row label="Fin pesee" value={frDate(of.dateFinPesee)} />
            <Row label="Fin granulation" value={frDate(of.dateFinGranulation)} />
            <Row label="Fin melange" value={frDate(of.dateFinMelange)} />
            <Row label="Fin comp/remp" value={frDate(of.dateFinCompRemp)} />
            <Row label="Fin pelliculage" value={frDate(of.dateFinPelliculage)} />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-brand-800">Quantites &amp; rendements</h3>
            <Row label="Quantite (kg)" value={num(of.quantiteKg)} />
            <Row label="Quantite theorique (kg)" value={num(of.quantiteTheoriqueKg)} />
            <Row label="Quantite fabriquee (cps)" value={num(of.quantiteFabriqueeCps)} />
            <Row label="Y % (kg)" value={pct(of.rendementKg1)} />
            <Row label="Y % CPS" value={pct(of.rendementCps1)} />
            <Row label="Rendement total" value={<span className={of.rendementHorsSeuil ? 'text-red-600' : 'text-green-700'}>{pct(of.rendementTotal)}</span>} />
            <h3 className="mb-1 mt-4 text-sm font-semibold text-brand-800">Controle</h3>
            <Row label="Statut" value={of.statutLibere} />
            <Row label="Verificateur" value={of.verifier?.name ?? of.verificateurNom} />
            <Row label="Fin fabrication" value={frDate(of.dateFinFabrication)} />
            <Row label="Fin CNDT" value={frDate(of.dateFinCNDT)} />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Workflow</h3>
          {nextStates.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune transition disponible.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nextStates.map((s) => (
                <button key={s} className="btn-secondary text-sm" disabled={busy} onClick={() => transition(s)}>
                  <ArrowRight size={14} /> Passer a « {WORKFLOW_LABELS[s]} »
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Signatures electroniques (21 CFR Part 11)</h3>
          {of.signatures && of.signatures.length > 0 ? (
            <ul className="mb-3 space-y-1 text-sm">
              {of.signatures.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-1">
                  <PenLine size={14} className="text-brand-700" />
                  <span className="font-medium">{MEANING_LABELS[s.meaning] ?? s.meaning}</span>
                  <span className="text-slate-500">par {s.userLabel}</span>
                  <span className="text-slate-400">le {frDateTime(s.signedAt)}</span>
                  <span className="text-slate-500 italic">— {s.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-slate-400">Aucune signature pour le moment.</p>
          )}
          {can('of:sign') && (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <select className="input" value={signMeaning} onChange={(e) => setSignMeaning(e.target.value)}>
                <option value="AUTHOR">Auteur / Realisation</option>
                <option value="REVIEWER">Verificateur</option>
                <option value="APPROVER">Approbateur / Liberation</option>
              </select>
              <input className="input md:col-span-1" placeholder="Motif" value={signReason} onChange={(e) => setSignReason(e.target.value)} />
              <input className="input" type="password" placeholder="Votre mot de passe" value={signPwd} onChange={(e) => setSignPwd(e.target.value)} />
              <button className="btn-primary" disabled={busy || !signReason || !signPwd} onClick={sign}>
                <PenLine size={14} /> Signer
              </button>
            </div>
          )}
        </div>

        {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end">
          <button className="btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </Modal>
  );
}
