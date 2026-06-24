import { useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { AlertTriangle, Clock, Package } from 'lucide-react';

interface EncoursItem {
  id: string;
  numeroOF: string; numeroLot: string;
  finValiditeOF?: string; qteSF?: number;
  joursValidite: number | null; valeur: number | null; alerte: boolean;
  produit: { codePF: string; designation: string; donneurOrdre: { nom: string }; formeGalenique: { nom: string } };
  prolongations: { id: string; statut: string }[];
}

interface DdlItem {
  id: string; statut: string; joursAttente: number | null; alerte: boolean;
  dateEnvoi?: string; observation?: string;
  of: { numeroOF: string; numeroLot: string; produit: { codePF: string; designation: string; donneurOrdre: { nom: string } } };
  verificateur?: { firstName: string; lastName: string };
}

function EncoursTab() {
  const [rows, setRows] = useState<EncoursItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/fabrication/encours').then((r) => setRows(r.data))
      .catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  }, []);

  const valeurTotal = rows.reduce((s, r) => s + (r.valeur ?? 0), 0);
  const alertes = rows.filter((r) => r.alerte).length;

  return (
    <div>
      {/* KPI rapides */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <Package size={24} className="text-blue-500" />
          <div><div className="text-2xl font-bold">{rows.length}</div><div className="text-xs text-slate-500">Lots en attente de cndt</div></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <AlertTriangle size={24} className="text-red-500" />
          <div><div className="text-2xl font-bold text-red-600">{alertes}</div><div className="text-xs text-slate-500">Alertes péremption (&lt;30j)</div></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="text-xl font-bold text-green-700">{valeurTotal.toLocaleString()} DA</div>
          <div className="text-xs text-slate-500 ml-2">Valeur totale des en-cours</div>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {loading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs">
                <th className="px-3 py-2 font-medium text-left">N° OF</th>
                <th className="px-3 py-2 font-medium text-left">Lot</th>
                <th className="px-3 py-2 font-medium text-left">Produit</th>
                <th className="px-3 py-2 font-medium text-left">Donneur</th>
                <th className="px-3 py-2 font-medium text-right">Qté SF (kg)</th>
                <th className="px-3 py-2 font-medium text-right">Valeur</th>
                <th className="px-3 py-2 font-medium text-center">Validité restante</th>
                <th className="px-3 py-2 font-medium text-center">Prolongation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t border-slate-100 hover:bg-slate-50 ${r.alerte ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-2 font-mono text-xs">{r.numeroOF}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.numeroLot}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium">{r.produit.codePF}</div>
                    <div className="text-slate-500">{r.produit.designation}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.produit.donneurOrdre.nom}</td>
                  <td className="px-3 py-2 text-right text-xs">{r.qteSF?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-xs">{r.valeur != null ? r.valeur.toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    {r.joursValidite != null ? (
                      <span className={`flex items-center justify-center gap-1 ${r.joursValidite < 0 ? 'text-red-600 font-bold' : r.joursValidite < 30 ? 'text-amber-600 font-semibold' : 'text-green-600'}`}>
                        {r.alerte && <AlertTriangle size={12} />}
                        {r.joursValidite}j
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {r.prolongations.length > 0 ? (
                      <span className="badge badge-amber">{r.prolongations[0].statut}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Aucun en-cours</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DdlTab() {
  const [rows, setRows] = useState<DdlItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/fabrication/ddl/attente').then((r) => setRows(r.data))
      .catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  }, []);

  const alertes = rows.filter((r) => r.alerte).length;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div><div className="text-2xl font-bold">{rows.length}</div><div className="text-xs text-slate-500">DDL en attente</div></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <AlertTriangle size={24} className="text-red-500" />
          <div><div className="text-2xl font-bold text-red-600">{alertes}</div><div className="text-xs text-slate-500">DDL en retard (&gt;7j)</div></div>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {loading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs">
                <th className="px-3 py-2 font-medium text-left">N° OF</th>
                <th className="px-3 py-2 font-medium text-left">Produit</th>
                <th className="px-3 py-2 font-medium text-left">Donneur</th>
                <th className="px-3 py-2 font-medium text-left">Statut DDL</th>
                <th className="px-3 py-2 font-medium text-left">Vérificateur</th>
                <th className="px-3 py-2 font-medium text-center">Jours attente</th>
                <th className="px-3 py-2 font-medium text-left">Envoi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t border-slate-100 hover:bg-slate-50 ${r.alerte ? 'bg-amber-50' : ''}`}>
                  <td className="px-3 py-2 font-mono text-xs">{r.of.numeroOF}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium">{r.of.produit.codePF}</div>
                    <div className="text-slate-500">{r.of.produit.designation}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.of.produit.donneurOrdre.nom}</td>
                  <td className="px-3 py-2">
                    <span className={`badge text-xs ${r.statut === 'VALIDE' ? 'badge-green' : r.statut === 'EN_VERIFICATION' ? 'badge-blue' : r.statut === 'RECTIFICATION' ? 'badge-red' : 'badge-slate'}`}>
                      {r.statut}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.verificateur ? `${r.verificateur.firstName} ${r.verificateur.lastName}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {r.joursAttente != null ? (
                      <span className={r.joursAttente > 7 ? 'text-red-600 font-bold' : r.joursAttente > 3 ? 'text-amber-600' : ''}>
                        {r.alerte && <AlertTriangle size={12} className="inline mr-1" />}
                        {r.joursAttente}j
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.dateEnvoi ? new Date(r.dateEnvoi).toLocaleDateString('fr-FR') : '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Aucun DDL en attente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function EncoursDdlPage({ mode = 'encours' }: { mode?: 'encours' | 'ddl' }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">
        {mode === 'encours' ? 'En-cours & Disponibilité produit' : 'Dossiers de Lot (DDL) — Circuit de vérification'}
      </h1>
      {mode === 'encours' ? <EncoursTab /> : <DdlTab />}
    </div>
  );
}
