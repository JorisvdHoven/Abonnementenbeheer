import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../hooks/useNotifications';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { formatDate } from '../lib/format';
import { BellIcon, XMarkIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

const LINKS = [
  { to: '/dashboard',     label: 'Dashboard' },
  { to: '/subscriptions', label: 'Abonnementen' },
  { to: '/evaluatie',     label: 'Evaluatie' },
  { to: '/settings',      label: 'Instellingen' },
];

const ADMIN_LINKS = [
  { to: '/activiteit',    label: 'Activiteit' },
];

function Navbar({ user }) {
  const location = useLocation();
  const { notifications, dismissNotification } = useNotifications();
  const { isAdmin } = useCurrentUser();
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
  const allLinks = [...LINKS, ...(isAdmin ? ADMIN_LINKS : [])];
  const notifCount = notifications.length;

  return (
    <nav className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">

        {/* Left: logo + links */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/flexurity-logo-white.svg" alt="Flexurity" className="h-7 w-auto" />
          </Link>
          <div className="hidden sm:flex items-center gap-0.5">
            {allLinks.map(({ to, label }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: bell + user + logout */}
        <div className="flex items-center gap-1">

          {/* Bell met numerieke badge */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen(o => !o)}
              aria-label="Notificaties"
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
            >
              <BellIcon className="h-5 w-5" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-900 tabular-nums">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/70 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notificaties</p>
                  {notifCount > 0 && (
                    <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full tabular-nums">{notifCount}</span>
                  )}
                </div>
                {notifCount === 0 ? (
                  <div className="px-4 py-8 text-sm text-slate-400 text-center">Momenteel geen notificaties</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.slice(0, 5).map((sub) => (
                      <div key={sub.id} className="flex items-start justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{sub.name}</p>
                          {sub._type === 'verlopen' ? (
                            <p className="text-xs text-red-500 mt-0.5 tabular-nums">Verlopen op {formatDate(sub.renewal_date)}</p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">Verloopt op {formatDate(sub.renewal_date)}</p>
                          )}
                        </div>
                        <button
                          onClick={() => dismissNotification(sub.id)}
                          aria-label="Wegklikken"
                          className="ml-2 p-1 -m-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-md flex-shrink-0 transition-colors"
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

          {/* User chip — gradient avatar + naam */}
          <div className="flex items-center gap-2 ml-1 px-2 py-1 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-800 flex-shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-slate-200 hidden md:block">{displayName}</span>
          </div>

          {/* Logout */}
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
            title="Uitloggen"
            aria-label="Uitloggen"
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
