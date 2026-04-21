import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Wachtwoorden komen niet overeen.'); return; }
    if (password.length < 6) { setError('Wachtwoord moet minimaal 6 tekens zijn.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-slate-900/90 border border-white/10 shadow-2xl rounded-[2rem] p-8 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-3xl bg-primary flex items-center justify-center text-white text-xl font-bold shadow-lg">F</div>
          <h2 className="mt-6 text-3xl font-semibold text-white">Nieuw wachtwoord</h2>
          <p className="mt-3 text-sm text-slate-300">Kies een nieuw wachtwoord voor je account.</p>
        </div>

        {success ? (
          <div className="rounded-2xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-200 text-center">
            Wachtwoord gewijzigd! Je wordt teruggestuurd naar de loginpagina...
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Nieuw wachtwoord</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Minimaal 6 tekens"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Bevestig wachtwoord</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Herhaal wachtwoord"
              />
            </div>
            {error && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-200 text-center">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-xl transition hover:opacity-90 focus:outline-none"
            >
              {loading ? 'Opslaan...' : 'Wachtwoord opslaan'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
