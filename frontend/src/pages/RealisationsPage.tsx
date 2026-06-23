import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Upload, Download, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import { api, apiError } from '../api/client';
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
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (aql) params.set('aql', aql);
    api.get(`/ordres?${params.toString()}`).then((r) => setResult(r.data)).catch((e) => setError(apiError(e)));
  }, [page, search, status, aql]);

  useEffect(() => { load(); }, [load]);

  async function handleExport() {
    try {
      const res = await api.get('/realisations/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `realisations-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setInfo('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/realisations/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setInfo(`Import termine : ${res.data.imported} ordre(s) cree(s)${res.data.errors?.length ? `, ${res.data.errors.length} erreur(s)` : ''}.`);
      load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(of: OrdreFabrication) {
    const reason = window.prompt(`Motif de suppression de l'OF (lot ${of.numeroLot}) :`);
    if (!reason) return;
    try {
      await api.delete(`/ordres/${of.id}`, { data: { reason } });
      load();
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Realisations (Ordres de fabrication)</h1>
        <div className="flex flex-wrap gap-2">
          {can('of:import') && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Importer Excel
              </button>
            </>
          )}
          {can('of:export') && (
            <button className="btn-secondary" onClick={handleExport}>
              <Download size={16} /> Exporter Excel
            </button>
          )}
          {can('of:create') && (
            <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus size={16} /> Nouvel OF
            </button>
          )}
        </div>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[220px]">
          <label className="label">Recherche (produit, designation, lot)</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input className="input pl-9" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="PFMEB16, Vitamine C, 14169…" />
          </div>
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Tous</option>
            <option value="CREATION">Creation</option>
            <option value="EN_COURS">En cours</option>
            <option value="FABRICATION_TERMINEE">Fabrication terminee</option>
            <option value="VERIFICATION">Verification</option>
            <option value="RECTIFICATION">Rectification</option>
            <option value="CLOTURE">Cloture</option>
          </select>
        </div>
        <div>
          <label className="label">AQL</label>
          <select className="input" value={aql} onChange={(e) => { setPage(1); setAql(e.target.value); }}>
            <option value="">Tous</option>
            <option value="CONFORME">CONFORME</option>
            <option value="NON CONFORME">NON CONFORME</option>
            <option value="EN ATTENTE">EN ATTENTE</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {info && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{info}</div>}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Code produit</th>
              <th className="th">Designation</th>
              <th className="th">N lot</th>
              <th className="th">Ligne</th>
              <th className="th">Statut</th>
              <th className="th">Rendement</th>
              <th className="th">AQL</th>
              <th className="th">Fin fab.</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result?.data.map((of) => (
              <tr key={of.id} className="hover:bg-slate-50">
                <td className="td font-medium">{of.codeProduit}</td>
                <td className="td max-w-[260px] truncate" title={of.designation}>{of.designation}</td>
                <td className="td">{of.numeroLot}</td>
                <td className="td">{of.cndt}</td>
                <td className="td"><span className={`badge ${STATUS_COLORS[of.workflowStatus] ?? 'bg-slate-100'}`}>{of.workflowLabel}</span></td>
                <td className="td"><span className={of.rendementHorsSeuil ? 'text-red-600 font-semibold' : ''}>{pct(of.rendementTotal)}</span></td>
                <td className="td">{of.aql ? <span className={`badge ${aqlColor(of.aql)}`}>{of.aql}</span> : '—'}</td>
                <td className="td">{frDate(of.dateFinFabrication)}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700" title="Detail" onClick={() => setDetailId(of.id)}>
                      <Eye size={16} />
                    </button>
                    {can('of:update') && (
                      <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700" title="Modifier" onClick={() => { setEditing(of); setFormOpen(true); }}>
                        <Pencil size={16} />
                      </button>
                    )}
                    {can('of:delete') && (
                      <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Supprimer" onClick={() => handleDelete(of)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {result && result.data.length === 0 && (
              <tr><td colSpan={9} className="td py-8 text-center text-slate-400">Aucun ordre de fabrication.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {result && result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{result.pagination.total} ordre(s) — page {result.pagination.page}/{result.pagination.totalPages}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Precedent</button>
            <button className="btn-secondary" disabled={page >= result.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
          </div>
        </div>
      )}

      <OrdreFormModal open={formOpen} ordre={editing} onClose={() => setFormOpen(false)} onSaved={load} />
      <OrdreDetailModal open={!!detailId} ordreId={detailId} onClose={() => setDetailId(null)} onChanged={load} />
    </div>
  );
}
