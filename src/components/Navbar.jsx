import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../hooks/useNotifications';
import { BellIcon, XMarkIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

const LINKS = [
  { to: '/dashboard',     label: 'Dashboard' },
  { to: '/subscriptions', label: 'Abonnementen' },
  { to: '/evaluatie',     label: 'Evaluatie' },
  { to: '/settings',      label: 'Instellingen' },
];

function Navbar({ user }) {
  const location = useLocation();
  const { notifications, dismissNotification } = useNotifications();
  const [displayName, setDisplayName] = useState(user.email);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    supabase.from('profiles').select('full_name').eq('id', user.id).single()
      .then(({ data }) => { if (data?.full_name) setDisplayName(data.full_name); });
  }, [user.id]);

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <nav className="sticky top-0 z-40 bg-slate-900 border-b border-slate-700/60 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">

        {/* Left: logo + links */}
        <div className="flex items-center gap-6">
          <span className="text-base font-bold text-white tracking-tight">Flexurity</span>
          <div className="hidden sm:flex items-center gap-1">
            {LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: bell + user + logout */}
        <div className="flex items-center gap-3">

          {/* Bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen(o => !o)}
              className="relative p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <BellIcon className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl z-10 overflow-hidden border border-slate-100">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notificaties</p>
                  {notifications.length > 0 && (
                    <span className="text-xs font-semibold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">{notifications.length}</span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-400 text-center">Momenteel geen notificaties</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.slice(0, 5).map((sub) => (
                      <div key={sub.id} className="flex items-start justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{sub.name}</p>
                          {sub._type === 'verlopen' ? (
                            <p className="text-xs text-red-500 mt-0.5">Verlopen op {new Date(sub.end_date || sub.renewal_date).toLocaleDateString('nl-NL')}</p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5">Verloopt op {new Date(sub.renewal_date || sub.end_date).toLocaleDateString('nl-NL')}</p>
                          )}
                        </div>
                        <button onClick={() => dismissNotification(sub.id)} className="ml-2 text-slate-300 hover:text-slate-500 flex-shrink-0">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-700" />

          {/* Avatar + name */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <span className="text-sm text-slate-300 hidden md:block">{displayName}</span>
          </div>

          {/* Logout */}
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Uitloggen"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
            <span className="hidden md:block">Uitloggen</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
