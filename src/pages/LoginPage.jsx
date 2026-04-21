import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotStatus(null);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', forgotEmail)
      .single();

    if (!profiles) {
      setForgotStatus('not_found');
      setForgotLoading(false);
      return;
    }

    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin,
    });
    setForgotLoading(false);
    setForgotStatus('sent');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-slate-900/90 border border-white/10 shadow-2xl rounded-[2rem] p-8 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-3xl bg-primary flex items-center justify-center text-white text-xl font-bold shadow-lg">
            F
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-white">Welkom terug</h2>
          <p className="mt-3 text-sm text-slate-300">Log in om je abonnementen te beheren en snel inzicht te krijgen.</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">E-mailadres</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="naam@voorbeeld.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">Wachtwoord</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-200 text-center">{error}</div>
          )}
          <div className="space-y-3">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-primary/20 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Inloggen
            </button>
            <button
              type="button"
              onClick={() => { setForgotOpen(true); setForgotStatus(null); setForgotEmail(''); }}
              className="w-full text-sm text-slate-400 hover:text-slate-200 transition text-center"
            >
              Wachtwoord vergeten?
            </button>
          </div>
        </form>

        <div className="mt-8 text-sm text-slate-400 text-center">
          Geen account? Vraag je beheerder om een gebruikersaccount aan te maken.
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-1">Wachtwoord vergeten</h3>
            <p className="text-sm text-slate-400 mb-4">Vul je e-mailadres in en we sturen je een resetlink.</p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="naam@bedrijf.nl"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {forgotStatus === 'sent' && (
                <p className="text-sm text-green-400 text-center">Resetlink verstuurd! Check je e-mail.</p>
              )}
              {forgotStatus === 'not_found' && (
                <p className="text-sm text-red-400 text-center">Dit e-mailadres staat niet in het systeem. Vraag een beheerder om een account aan te maken.</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-600 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading || forgotStatus === 'sent'}
                  className="flex-1 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  {forgotLoading ? 'Versturen...' : 'Verstuur link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;