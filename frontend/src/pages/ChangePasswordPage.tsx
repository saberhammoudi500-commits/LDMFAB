import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function ChangePasswordPage() {
  const { user, setMustChangePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate('/login', { replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (next !== confirm) {
      setError('La confirmation ne correspond pas.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      setMustChangePassword(false);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6">
        <h1 className="text-xl font-bold text-slate-800">Changer le mot de passe</h1>
        <p className="text-sm text-slate-500">
          Politique : 10 caracteres minimum, majuscule, minuscule, chiffre et caractere special.
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
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
