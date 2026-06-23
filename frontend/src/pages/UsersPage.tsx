import { useEffect, useState } from 'react';
import { Plus, Pencil, KeyRound, UserX } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Modal } from '../components/Modal';
import { frDateTime } from '../lib/format';
import type { Role, UserRow } from '../lib/types';

export function UsersPage() {
  const { can } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  // form
  const [form, setForm] = useState({ matricule: '', email: '', firstName: '', lastName: '', service: '', password: '', roleIds: [] as string[] });

  function load() {
    api.get('/users').then((r) => setUsers(r.data)).catch((e) => setError(apiError(e)));
    api.get('/roles').then((r) => setRoles(r.data)).catch(() => {});
  }
  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm({ matricule: '', email: '', firstName: '', lastName: '', service: '', password: '', roleIds: [] });
    setError('');
    setModalOpen(true);
  }
  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({ matricule: u.matricule, email: u.email, firstName: u.firstName, lastName: u.lastName, service: u.service ?? '', password: '', roleIds: u.roles.map((r) => r.id) });
    setError('');
    setModalOpen(true);
  }

  function toggleRole(id: string) {
    setForm((f) => ({ ...f, roleIds: f.roleIds.includes(id) ? f.roleIds.filter((r) => r !== id) : [...f.roleIds, id] }));
  }

  async function save() {
    setError('');
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, {
          firstName: form.firstName, lastName: form.lastName, service: form.service || null, roleIds: form.roleIds,
          reason: 'Mise a jour fiche utilisateur',
        });
      } else {
        await api.post('/users', { ...form, service: form.service || null });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function resetPassword(u: UserRow) {
    const pwd = window.prompt(`Nouveau mot de passe temporaire pour ${u.firstName} ${u.lastName} :`);
    if (!pwd) return;
    try {
      await api.post(`/users/${u.id}/reset-password`, { newPassword: pwd, reason: 'Reinitialisation admin' });
      alert('Mot de passe reinitialise. L\'utilisateur devra le changer a la prochaine connexion.');
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function deactivate(u: UserRow) {
    const reason = window.prompt(`Motif de desactivation du compte ${u.matricule} :`);
    if (!reason) return;
    try {
      await api.delete(`/users/${u.id}`, { data: { reason } });
      load();
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Utilisateurs</h1>
        {can('users:create') && (
          <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvel utilisateur</button>
        )}
      </div>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Matricule</th><th className="th">Nom</th><th className="th">Email</th>
              <th className="th">Service</th><th className="th">Roles</th><th className="th">Statut</th>
              <th className="th">Derniere connexion</th><th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="td font-medium">{u.matricule}</td>
                <td className="td">{u.firstName} {u.lastName}</td>
                <td className="td">{u.email}</td>
                <td className="td">{u.service}</td>
                <td className="td">{u.roles.map((r) => r.name).join(', ') || '—'}</td>
                <td className="td">
                  {u.isActive
                    ? <span className="badge bg-green-100 text-green-700">Actif</span>
                    : <span className="badge bg-slate-200 text-slate-600">Inactif</span>}
                </td>
                <td className="td">{u.lastLoginAt ? frDateTime(u.lastLoginAt) : '—'}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    {can('users:update') && (
                      <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700" title="Modifier" onClick={() => openEdit(u)}><Pencil size={16} /></button>
                    )}
                    {can('users:update') && (
                      <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600" title="Reinitialiser mot de passe" onClick={() => resetPassword(u)}><KeyRound size={16} /></button>
                    )}
                    {can('users:delete') && u.isActive && (
                      <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Desactiver" onClick={() => deactivate(u)}><UserX size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title={editing ? 'Modifier utilisateur' : 'Nouvel utilisateur'} onClose={() => setModalOpen(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Matricule *</label>
              <input className="input" value={form.matricule} disabled={!!editing} onChange={(e) => setForm({ ...form, matricule: e.target.value })} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" value={form.email} disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Prenom *</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div>
              <label className="label">Service</label>
              <input className="input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
            </div>
            {!editing && (
              <div>
                <label className="label">Mot de passe initial *</label>
                <input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Ex: Pharma@2026" />
              </div>
            )}
          </div>
          <div>
            <label className="label">Roles &amp; responsabilites</label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                  className={`badge cursor-pointer ${form.roleIds.includes(r.id) ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={save}>Enregistrer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
