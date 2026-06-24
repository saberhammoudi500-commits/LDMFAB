import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export function ChangePasswordPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) navigate('/login', { replace: true });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (next !== confirm) { setError('La confirmation ne correspond pas.'); return; }
    if (next.length < 10) { setError('10 caractères minimum requis.'); return; }
    setLoading(true);

    // Vérifier le mot de passe actuel
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({ email: user!.email, password: current });
    if (reAuthErr) { setError('Mot de passe actuel incorrect.'); setLoading(false); return; }

    // Changer le mot de passe
    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    // Mettre à jour le flag must_change_password
    await supabase.from('profiles').update({ must_change_password: false, password_changed_at: new Date().toISOString() }).eq('id', user!.id);
    await supabase.from('audit_logs').insert({ user_id: user!.id, user_label: user!.name, action: 'PASSWORD_CHANGE', entity: 'User', entity_id: user!.id });

    await refreshUser();
    navigate('/', { replace: true });
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6">
        <h1 className="text-xl font-bold text-slate-800">Changer le mot de passe</h1>
        <p className="text-sm text-slate-500">
          Politique : 10 caractères minimum, majuscule, minuscule, chiffre et caractère spécial.
        </p>
        <div>
          <label className="label">Mot de passe actuel</label>
          <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="label">Nouveau mot de passe</label>
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div>
          <label className="label">Confirmer</label>
          <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Valider'}
          </button>
          <button type="button" className="btn-secondary" onClick={async () => { await logout(); navigate('/login'); }}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
