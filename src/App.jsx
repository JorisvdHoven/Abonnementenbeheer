import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase } from './lib/supabaseClient';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';
import Toaster from './components/Toaster';

// Lazy-loaded routes — eerste paint sneller, andere pagina's worden on-demand geladen
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const EvaluatiePage = lazy(() => import('./pages/EvaluatiePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const GebruikersBeheerPage = lazy(() => import('./pages/GebruikersBeheerPage'));
const ActiviteitPage = lazy(() => import('./pages/ActiviteitPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

function PageLoader() {
  return (
    <div className="flex justify-center items-center py-20 text-slate-400 text-sm">
      Laden...
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Detect invite en password recovery flow vanuit URL hash
    if (window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
        } else if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
          setIsRecovery(false);
        }
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <Toaster />
      {isRecovery ? (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="*" element={<ResetPasswordPage />} />
          </Routes>
        </Suspense>
      ) : user ? (
        <div className="min-h-screen bg-transparent">
          <Navbar user={user} />
          <main className="max-w-7xl mx-auto w-full">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/evaluatie" element={<EvaluatiePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/gebruikers" element={<GebruikersBeheerPage />} />
                <Route path="/activiteit" element={<ActiviteitPage />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
