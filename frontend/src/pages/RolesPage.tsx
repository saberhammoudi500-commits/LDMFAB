import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Modal } from '../components/Modal';
import type { Role } from '../lib/types';

interface PermDef { key: string; label: string; }

export function RolesPage() {
  const { can } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<PermDef[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; permissions: string[] }>({ name: '', description: '', permissions: [] });

  function load() {
    api.get('/roles').then((r) => setRoles(r.data)).catch((e) => setError(apiError(e)));
    api.get('/roles/permissions').then((r) => setPerms(r.data)).catch(() => {});
  }
  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '', permissions: [] });
    setError('');
    setOpen(true);
  }
  function openEdit(r: Role) {
    setEditing(r);
    setForm({ name: r.name, description: r.description ?? '', permissions: r.permissions });
    setError('');
    setOpen(true);
  }
  function togglePerm(key: string) {
    setForm((f) => ({ ...f, permissions: f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key] }));
  }

  async function save() {
    setError('');
    try {
      if (editing) await api.put(`/roles/${editing.id}`, form);
      else await api.post('/roles', form);
      setOpen(false);
      load();
    } catch (e) {
      setError(apiError(e));
    }
  }
  async function remove(r: Role) {
    if (!window.confirm(`Supprimer le role « ${r.name} » ?`)) return;
    try {
      await api.delete(`/roles/${r.id}`);
      load();
    } catch (e) {
      setError(apiError(e));
    }
  }

  const canManage = can('roles:manage');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Roles &amp; responsabilites</h1>
        {canManage && <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouveau role</button>}
      </div>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-slate-800">
                  {r.name}
                  {r.isSystem && <Lock size={13} className="text-slate-400" />}
                </h3>
                <p className="text-xs text-slate-500">{r.description}</p>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <button className="rounded p-1 text-slate-400 hover:text-brand-700" onClick={() => openEdit(r)}><Pencil size={15} /></button>
                  {!r.isSystem && <button className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => remove(r)}><Trash2 size={15} /></button>}
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              <span className="font-medium">{r.permissions.length}</span> permission(s) — {r.userCount ?? 0} utilisateur(s)
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {r.permissions.slice(0, 6).map((p) => (
                <span key={p} className="badge bg-slate-100 text-[10px] text-slate-600">{p}</span>
              ))}
              {r.permissions.length > 6 && <span className="badge bg-slate-100 text-[10px] text-slate-500">+{r.permissions.length - 6}</span>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} title={editing ? `Modifier le role ${editing.name}` : 'Nouveau role'} onClose={() => setOpen(false)} size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nom du role *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Permissions</label>
            <div className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded border border-slate-200 p-3 md:grid-cols-2">
              {perms.map((p) => (
                <label key={p.key} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={form.permissions.includes(p.key)} onChange={() => togglePerm(p.key)} />
                  <span>{p.label}</span>
                  <code className="ml-auto text-[10px] text-slate-400">{p.key}</code>
                </label>
              ))}
            </div>
          </div>
          {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={save}>Enregistrer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
