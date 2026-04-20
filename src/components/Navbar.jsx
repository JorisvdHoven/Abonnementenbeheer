import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../hooks/useNotifications';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';

function Navbar({ user }) {
  const location = useLocation();
  const { notifications, dismissNotification } = useNotifications();
  const [displayName, setDisplayName] = useState(user.email);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    supabase.from('profiles').select('full_name').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.full_name) setDisplayName(data.full_name);
      });
  }, [user.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-300 bg-slate-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-white">Flexurity</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-3 sm:items-center">
              <Link
                to="/dashboard"
                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive('/dashboard')
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white hover:shadow-md'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/subscriptions"
                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive('/subscriptions')
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white hover:shadow-md'
                }`}
              >
                Abonnementen
              </Link>
              <Link
                to="/evaluatie"
                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive('/evaluatie')
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white hover:shadow-md'
                }`}
              >
                Evaluatie
              </Link>
              <Link
                to="/settings"
                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive('/settings')
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white hover:shadow-md'
                }`}
              >
                Instellingen
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(o => !o)}
                className="rounded-full bg-slate-800 p-2 text-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-700 hover:text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notificaties</p>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-slate-400 text-center">
                      Momenteel geen notificaties
                    </div>
                  ) : (
                    <div className="py-1 max-h-80 overflow-y-auto">
                      {notifications.slice(0, 5).map((sub) => (
                        <div key={sub.id} className="flex items-start justify-between px-4 py-2 text-sm text-gray-700 border-b last:border-0">
                          <div>
                            <div className="font-medium">{sub.name}</div>
                            {sub._type === 'verlopen' ? (
                              <div className="text-xs text-red-500 font-medium">
                                Verlopen op {new Date(sub.end_date || sub.renewal_date).toLocaleDateString('nl-NL')}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                Verloopt op {new Date(sub.renewal_date || sub.end_date).toLocaleDateString('nl-NL')}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => dismissNotification(sub.id)}
                            className="ml-2 mt-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-100">{displayName}</span>
            <button onClick={handleLogout} className="btn-primary text-sm">
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
