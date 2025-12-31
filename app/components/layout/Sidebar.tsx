/**
 * Sidebar Component - Navigation Menu
 */

import { Link, useLocation } from '@remix-run/react';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/tours', label: 'Tours', icon: '🏛️' },
  { path: '/cities', label: 'Cities', icon: '🏙️' },
  { path: '/categories', label: 'Categories', icon: '📁' },
  { path: '/news', label: 'News', icon: '📰' },
  { path: '/offers', label: 'Offers', icon: '🎁' },
  { path: '/reservations', label: 'Reservations', icon: '📅' },
  { path: '/users', label: 'Users', icon: '👥' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Tours Admin</h1>
        <p className="text-sm text-gray-400 mt-1">Management Dashboard</p>
      </div>

      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
          <span className="text-xl">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
