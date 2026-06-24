import { useEffect, useState } from 'react';
import { Plus, Pencil, KeyRound, UserX } from 'lucide-react';
import { fetchUsers, fetchRoles, createUser, toggleUserActive, writeAudit } from '../lib/db';
import { supabase } from '../lib/supabase';
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
  const [form, setForm] = useState({ matricule: '', email: '', firstName: '', lastName: '', service: '', password: '', roleIds: [] as string[] });

  function load() {
    fetchUsers().then(setUsers).catch((e) => setError(e.message));
    fetchRoles().then(setRoles).catch(() => {});
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
        // Mise à jour des informations de profil
        const { error: err } = await supabase.from('profiles').update({
          first_name: form.firstName, last_name: form.lastName, service: form.service || null,
        }).eq('id', editing.id);
        if (err) throw new Error(err.message);

        // Mise à jour des rôles
        await supabase.from('user_roles').delete().eq('user_id', editing.id);
        if (form.roleIds.length > 0) {
          await supabase.from('user_roles').insert(form.roleIds.map((roleId) => ({ user_id: editing.id, role_id: roleId })));
        }
        await writeAudit({ action: 'UPDATE', entity: 'User', entityId: editing.id, reason: 'Mise à jour fiche utilisateur' });
      } else {
        await createUser({ email: form.email, matricule: form.matricule, firstName: form.firstName, lastName: form.lastName, service: form.service || undefined, password: form.password, roleIds: form.roleIds });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deactivate(u: UserRow) {
    const reason = window.prompt(`Motif de desactivation du compte ${u.matricule} :`);
    if (!reason) return;
    try {
      await toggleUserActive(u.id, false);
      load();
    } catch (e: any) {
      setError(e.message);
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
            <div><label className="label">Matricule *</label><input className="input" value={form.matricule} disabled={!!editing} onChange={(e) => setForm({ ...form, matricule: e.target.value })} /></div>
            <div><label className="label">Email *</label><input className="input" value={form.email} disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Prenom *</label><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><label className="label">Nom *</label><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            <div><label className="label">Service</label><input className="input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} /></div>
            {!editing && <div><label className="label">Mot de passe initial *</label><input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Ex: Pharma@2026" /></div>}
          </div>
          <div>
            <label className="label">Roles</label>
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
