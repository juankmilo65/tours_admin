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
    <aside 
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--color-primary-dark-900)',
        color: 'white',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        overflowY: 'auto',
      }}
    >
      <div 
        style={{
          padding: 'var(--space-6)',
          borderBottom: '1px solid var(--color-primary-dark-700)',
        }}
      >
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
          Tours Admin
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-300)', marginTop: 'var(--space-1)' }}>
          Management Dashboard
        </p>
      </div>

      <nav style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {navItems.map((item) => {
          const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                transition: 'background-color var(--transition-base)',
                color: isActive ? 'white' : 'var(--color-primary-300)',
                backgroundColor: isActive ? 'var(--color-primary-600)' : 'transparent',
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-dark-700)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-primary-300)';
                }
              }}
            >
              <span style={{ fontSize: 'var(--text-xl)' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--color-primary-dark-700)',
        }}
      >
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            color: 'var(--color-primary-300)',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'inherit',
            cursor: 'pointer',
            transition: 'background-color var(--transition-base)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary-dark-700)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-primary-300)';
          }}
        >
          <span style={{ fontSize: 'var(--text-xl)' }}>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
