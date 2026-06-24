import { Fragment, useCallback, useEffect, useState } from 'react';
import { fetchAuditLogs } from '../lib/db';
import { frDateTime } from '../lib/format';
import type { Paginated } from '../lib/types';

interface AuditEntry {
  id: string;
  timestamp: string;
  user_label: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  reason: string | null;
  old_value: unknown;
  new_value: unknown;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-slate-100 text-slate-600',
  LOGOUT: 'bg-slate-100 text-slate-600',
  SIGN: 'bg-purple-100 text-purple-700',
  EXPORT: 'bg-cyan-100 text-cyan-700',
  IMPORT: 'bg-amber-100 text-amber-700',
  PASSWORD_CHANGE: 'bg-orange-100 text-orange-700',
};

export function AuditPage() {
  const [result, setResult] = useState<Paginated<AuditEntry> | null>(null);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchAuditLogs({ page, pageSize: 50, entity: entity || undefined, action: action || undefined })
      .then((r) => setResult(r as any))
      .catch((e) => setError(e.message));
  }, [page, entity, action]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Piste d'audit</h1>
        <p className="text-sm text-slate-500">Journal immuable de toutes les actions (21 CFR Part 11).</p>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Entite</label>
          <select className="input" value={entity} onChange={(e) => { setPage(1); setEntity(e.target.value); }}>
            <option value="">Toutes</option>
            <option value="OrdreFabrication">Ordre de fabrication</option>
            <option value="User">Utilisateur</option>
            <option value="Role">Role</option>
            <option value="Session">Session</option>
          </select>
        </div>
        <div>
          <label className="label">Action</label>
          <select className="input" value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }}>
            <option value="">Toutes</option>
            {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SIGN', 'EXPORT', 'IMPORT', 'PASSWORD_CHANGE'].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Horodatage</th><th className="th">Utilisateur</th><th className="th">Action</th>
              <th className="th">Entite</th><th className="th">Motif</th><th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result?.data.map((e) => (
              <Fragment key={e.id}>
                <tr className="hover:bg-slate-50">
                  <td className="td">{frDateTime(e.timestamp)}</td>
                  <td className="td">{e.user_label ?? '—'}</td>
                  <td className="td"><span className={`badge ${ACTION_COLORS[e.action] ?? 'bg-slate-100'}`}>{e.action}</span></td>
                  <td className="td">{e.entity}{e.entity_id ? ` #${e.entity_id.slice(0, 8)}` : ''}</td>
                  <td className="td max-w-[260px] truncate" title={e.reason ?? ''}>{e.reason ?? '—'}</td>
                  <td className="td">
                    {(e.old_value != null || e.new_value != null) && (
                      <button className="text-xs text-brand-700 hover:underline" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                        {expanded === e.id ? 'Masquer' : 'Details'}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === e.id && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-4 py-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="mb-1 font-semibold text-slate-500">Avant</div>
                          <pre className="overflow-x-auto rounded bg-white p-2 text-slate-700">{e.old_value ? JSON.stringify(e.old_value, null, 2) : '—'}</pre>
                        </div>
                        <div>
                          <div className="mb-1 font-semibold text-slate-500">Apres</div>
                          <pre className="overflow-x-auto rounded bg-white p-2 text-slate-700">{e.new_value ? JSON.stringify(e.new_value, null, 2) : '—'}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {result && result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{result.pagination.total} entree(s) — page {result.pagination.page}/{result.pagination.totalPages}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Precedent</button>
            <button className="btn-secondary" disabled={page >= result.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
          </div>
        </div>
      )}
    </div>
  );
}
