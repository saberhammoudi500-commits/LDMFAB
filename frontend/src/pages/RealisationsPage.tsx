import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Upload, Download, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchOrdres, softDeleteOrdre, importOrdres, writeAudit } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { frDate, pct, num, STATUS_COLORS, aqlColor } from '../lib/format';
import type { OrdreFabrication, Paginated } from '../lib/types';
import { OrdreFormModal } from './OrdreFormModal';
import { OrdreDetailModal } from './OrdreDetailModal';

export function RealisationsPage() {
  const { can } = useAuth();
  const [result, setResult] = useState<Paginated<OrdreFabrication> | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [aql, setAql] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OrdreFabrication | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetchOrdres({ page, pageSize: 25, search: search || undefined, status: status || undefined, aql: aql || undefined })
      .then(setResult)
      .catch((e: any) => setError(e.message));
  }, [page, search, status, aql]);

  useEffect(() => { load(); }, [load]);

  async function handleExport() {
    try {
      const { data } = await supabase.from('ordres_fabrication').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      const ws = XLSX.utils.json_to_sheet(data ?? []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Realisations');
      XLSX.writeFile(wb, `realisations-${Date.now()}.xlsx`);
      await writeAudit({ action: 'EXPORT', entity: 'OrdreFabrication' });
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setInfo('');
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as any[];
      const mapped = rows.map((r) => ({
        codeProduit: r['Code Produit'] ?? r.code_produit ?? '',
        designation: r['Designation'] ?? r.designation ?? '',
        numeroLot: String(r['N° Lot'] ?? r.numero_lot ?? ''),
        quantiteKg: parseFloat(r['Qté KG'] ?? r.quantite_kg ?? 0) || null,
        quantiteTheoriqueKg: parseFloat(r['Qté Théorique KG'] ?? r.quantite_theorique_kg ?? 0) || null,
        workflowStatus: 'CREATION',
      }));
      const res = await importOrdres(mapped);
      setInfo(`Import terminé : ${res.imported} ordre(s) créé(s)${res.errors.length ? `, ${res.errors.length} erreur(s)` : ''}.`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(of: OrdreFabrication) {
    const reason = window.prompt(`Motif de suppression de l'OF (lot ${of.numeroLot}) :`);
    if (!reason) return;
    try { await softDeleteOrdre(of.id, reason); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Realisations (OF)</h1>
        <div className="flex gap-2">
          {can('of:import') && (<><button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Importer</button><input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} /></>)}
          {can('of:export') && <button className="btn-secondary" onClick={handleExport}><Download size={16} /> Exporter</button>}
          {can('of:create') && <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> Nouvel OF</button>}
        </div>
      </div>
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-brand-500">
          <Search size={16} className="text-slate-400" />
          <input className="outline-none" placeholder="Code produit, lot, designation…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Tous</option>
            {['CREATION','EN_COURS','FABRICATION_TERMINEE','VERIFICATION','RECTIFICATION','CLOTURE'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">AQL</label>
          <select className="input" value={aql} onChange={(e) => { setPage(1); setAql(e.target.value); }}>
            <option value="">Tous</option>
            <option value="CONFORME">CONFORME</option>
            <option value="NON CONFORME">NON CONFORME</option>
          </select>
        </div>
      </div>
      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {info && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{info}</div>}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Code produit</th><th className="th">Designation</th><th className="th">N° Lot</th>
              <th className="th">Date decl.</th><th className="th">Qte KG</th><th className="th">Rend. Total</th>
              <th className="th">AQL</th><th className="th">Statut</th><th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result?.data.map((of) => (
              <tr key={of.id} className="hover:bg-slate-50">
                <td className="td font-medium">{of.codeProduit}</td>
                <td className="td max-w-[200px] truncate" title={of.designation}>{of.designation}</td>
                <td className="td">{of.numeroLot}</td>
                <td className="td">{frDate(of.dateDeclarationSF)}</td>
                <td className="td">{num(of.quantiteKg)}</td>
                <td className={`td font-medium ${of.rendementHorsSeuil ? 'text-red-600' : 'text-emerald-700'}`}>{pct(of.rendementTotal)}</td>
                <td className="td"><span className={`badge ${aqlColor(of.aql)}`}>{of.aql ?? '—'}</span></td>
                <td className="td"><span className={`badge ${STATUS_COLORS[of.workflowStatus] ?? 'bg-slate-100 text-slate-600'}`}>{of.workflowLabel}</span></td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Voir" onClick={() => setDetailId(of.id)}><Eye size={16} /></button>
                    {can('of:update') && <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700" title="Modifier" onClick={() => { setEditing(of); setFormOpen(true); }}><Pencil size={16} /></button>}
                    {can('of:delete') && <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Supprimer" onClick={() => handleDelete(of)}><Trash2 size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result && result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{result.pagination.total} OF — page {result.pagination.page}/{result.pagination.totalPages}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Precedent</button>
            <button className="btn-secondary" disabled={page >= result.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
          </div>
        </div>
      )}
      {formOpen && <OrdreFormModal of={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />}
      {detailId && <OrdreDetailModal id={detailId} onClose={() => setDetailId(null)} onRefresh={load} />}
    </div>
  );
}
