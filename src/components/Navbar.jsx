import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../hooks/useNotifications';
import { BellIcon } from '@heroicons/react/24/outline';

function Navbar({ user }) {
  const location = useLocation();
  const { notifications } = useNotifications();

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
                to="/reviews"
                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive('/reviews')
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white hover:shadow-md'
                }`}
              >
                Reviews
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
            <div className="relative">
              <button className="rounded-full bg-slate-800 p-2 text-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-700 hover:text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>
              {/* Dropdown for notifications */}
              {notifications.length > 0 && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    {notifications.slice(0, 5).map((sub) => (
                      <div key={sub.id} className="px-4 py-2 text-sm text-gray-700 border-b">
                        <div className="font-medium">{sub.name}</div>
                        <div className="text-xs text-gray-500">Verloopt op {new Date(sub.renewal_date).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-100">{user.email}</span>
            <button
              onClick={handleLogout}
              className="btn-primary text-sm"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;