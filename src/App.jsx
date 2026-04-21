import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import EvaluatiePage from './pages/EvaluatiePage';
import SettingsPage from './pages/SettingsPage';
import GebruikersBeheerPage from './pages/GebruikersBeheerPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Navbar from './components/Navbar';
import { useDailySnapshot } from './hooks/useDailySnapshot';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  useDailySnapshot();

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
      {isRecovery ? (
        <Routes>
          <Route path="*" element={<ResetPasswordPage />} />
        </Routes>
      ) : user ? (
        <div className="min-h-screen bg-transparent">
          <Navbar user={user} />
          <main className="max-w-7xl mx-auto w-full">
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/evaluatie" element={<EvaluatiePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/gebruikers" element={<GebruikersBeheerPage />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
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
