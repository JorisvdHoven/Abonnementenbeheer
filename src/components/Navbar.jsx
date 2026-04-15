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
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-primary">Flexurity</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'border-primary text-primary bg-primary-light'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/subscriptions"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/subscriptions')
                    ? 'border-primary text-primary bg-primary-light'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Abonnementen
              </Link>
              <Link
                to="/reviews"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/reviews')
                    ? 'border-primary text-primary bg-primary-light'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Reviews
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <div className="relative">
              <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
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
            <span className="text-sm text-gray-700">{user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-primary text-white px-3 py-1 rounded-md text-sm hover:opacity-90"
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